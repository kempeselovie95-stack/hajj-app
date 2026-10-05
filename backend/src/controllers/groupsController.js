const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const mediaDir = path.resolve(__dirname, '../uploads/chat');
fs.mkdirSync(mediaDir, { recursive: true });
// Formats acceptés : photos (dont HEIC des iPhone), vidéos, notes vocales, PDF et documents Office.
const allowedMedia = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
]);
const EXTENSION_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jfif': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic', '.heif': 'image/heif', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.3gp': 'video/3gpp', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
// Certains navigateurs envoient « application/octet-stream » : on retrouve le type par l'extension.
const resolveMime = (file) => (allowedMedia.has(file.mimetype) ? file.mimetype : EXTENSION_MIME[path.extname(file.originalname || '').toLowerCase()] || null);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, mediaDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const normalizedExtension = extension === '.jfif' ? '.jpg' : extension;
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${normalizedExtension}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mime = resolveMime(file);
    if (!mime) return callback(new Error('UNSUPPORTED_MEDIA'));
    file.mimetype = mime;
    return callback(null, true);
  },
}).single('media');

async function getGroup(id) {
  const [rows] = await pool.execute(`SELECT g.*, a.nom_agence, CONCAT(u.prenom, ' ', u.nom) AS encadreur_nom FROM groupes_pelerins g JOIN agences a ON a.id=g.agence_id LEFT JOIN utilisateurs u ON u.id=g.encadreur_id WHERE g.id=?`, [id]);
  return rows[0] || null;
}

async function canAccessGroup(user, groupId) {
  const group = await getGroup(groupId);
  if (!group) return { group: null, allowed: false };
  if (user.role === 'admin') return { group, allowed: true };
  if (user.role === 'encadreur') return { group, allowed: Number(group.encadreur_id) === Number(user.id) };
  if (user.role === 'agence') {
    const [rows] = await pool.execute('SELECT id FROM agences WHERE id=? AND utilisateur_id=?', [group.agence_id, user.id]);
    return { group, allowed: rows.length > 0 };
  }
  const [rows] = await pool.execute('SELECT 1 FROM groupe_membres WHERE groupe_id=? AND pelerin_id=?', [groupId, user.id]);
  return { group, allowed: rows.length > 0 };
}

const listerGroupes = async (req, res, next) => {
  try {
    let where = '';
    const params = [];
    if (req.utilisateur.role === 'encadreur') { where = 'WHERE g.encadreur_id=?'; params.push(req.utilisateur.id); }
    else if (req.utilisateur.role === 'agence') { where = 'WHERE g.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)'; params.push(req.utilisateur.id); }
    else if (req.utilisateur.role === 'pelerin') { where = 'WHERE gm.pelerin_id=?'; params.push(req.utilisateur.id); }
    const [groups] = await pool.execute(`SELECT g.id,g.nom,g.annee_hajj,g.agence_id,g.encadreur_id,a.nom_agence,CONCAT(u.prenom,' ',u.nom) AS encadreur_nom,COUNT(gm.pelerin_id) AS total_membres FROM groupes_pelerins g JOIN agences a ON a.id=g.agence_id LEFT JOIN utilisateurs u ON u.id=g.encadreur_id LEFT JOIN groupe_membres gm ON gm.groupe_id=g.id ${req.utilisateur.role === 'pelerin' ? 'JOIN groupe_membres gm_filter ON gm_filter.groupe_id=g.id' : ''} ${where.replace('gm.pelerin_id', 'gm_filter.pelerin_id')} GROUP BY g.id ORDER BY g.annee_hajj DESC,g.nom`, params);
    res.json({ succes: true, groupes: groups });
  } catch (error) { next(error); }
};

const listerGuides = async (req, res, next) => {
  try {
    const params = [];
    let agencyFilter = '';
    if (req.utilisateur.role === 'agence') {
      agencyFilter = 'AND e.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)';
      params.push(req.utilisateur.id);
    }
    const [guides] = await pool.execute(
      `SELECT e.utilisateur_id AS id,u.prenom,u.nom,e.agence_id,a.nom_agence
       FROM encadreurs e JOIN utilisateurs u ON u.id=e.utilisateur_id JOIN agences a ON a.id=e.agence_id
       WHERE u.est_actif=TRUE ${agencyFilter} ORDER BY u.nom,u.prenom`,
      params
    );
    res.json({ succes: true, guides });
  } catch (error) { next(error); }
};

const listerPelerins = async (req, res, next) => {
  try {
    const year = Number.parseInt(req.query.annee_hajj, 10);
    const params = [year, year, year];
    let agencyFilter = '';
    if (req.utilisateur.role === 'agence') {
      agencyFilter = 'AND d.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)';
      params.push(req.utilisateur.id);
    } else if (req.query.agence_id) {
      agencyFilter = 'AND d.agence_id=?';
      params.push(Number(req.query.agence_id));
    }
    const [pilgrims] = await pool.execute(
      `SELECT u.id,u.prenom,u.nom,u.email,u.telephone,d.numero_dossier,
        (SELECT g.id FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id
         WHERE gm.pelerin_id=u.id AND g.annee_hajj=? LIMIT 1) AS groupe_id,
        (SELECT g.nom FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id
         WHERE gm.pelerin_id=u.id AND g.annee_hajj=? LIMIT 1) AS groupe_nom
       FROM dossiers d JOIN utilisateurs u ON u.id=d.pelerin_id
       WHERE d.annee_hajj=? AND u.role='pelerin' ${agencyFilter}
      ORDER BY u.nom,u.prenom`,
          params
    );
    res.json({ succes: true, pelerins: pilgrims });
  } catch (error) { next(error); }
};

const obtenirGroupe = async (req, res, next) => {
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed) return res.status(403).json({ succes: false, message: 'Accès refusé' });
    const [members] = await pool.execute(`SELECT u.id,u.nom,u.prenom,u.email,u.telephone,d.numero_dossier,d.statut FROM groupe_membres gm JOIN utilisateurs u ON u.id=gm.pelerin_id LEFT JOIN dossiers d ON d.pelerin_id=u.id AND d.annee_hajj=? WHERE gm.groupe_id=? ORDER BY u.nom,u.prenom`, [access.group.annee_hajj, req.params.id]);
    res.json({ succes: true, groupe: { ...access.group, membres: members } });
  } catch (error) { next(error); }
};

const creerGroupe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const { nom, annee_hajj, agence_id, encadreur_id = null } = req.body;
    let targetAgency = agence_id;
    if (req.utilisateur.role === 'agence') {
      const [agencyRows] = await pool.execute('SELECT id FROM agences WHERE utilisateur_id=?', [req.utilisateur.id]);
      if (!agencyRows.length) return res.status(400).json({ succes: false, message: 'Agence introuvable' });
      targetAgency = agencyRows[0].id;
    }
    if (!targetAgency) return res.status(400).json({ succes: false, message: 'Organisation requise.' });
    if (encadreur_id) {
      const [encadreurRows] = await pool.execute('SELECT utilisateur_id FROM encadreurs WHERE utilisateur_id=? AND agence_id=?', [encadreur_id, targetAgency]);
      if (!encadreurRows.length) return res.status(400).json({ succes: false, message: 'Guide non rattaché à cette agence.' });
    }
    const [result] = await pool.execute('INSERT INTO groupes_pelerins (nom, annee_hajj, agence_id, encadreur_id) VALUES (?,?,?,?)', [nom, annee_hajj, targetAgency, encadreur_id]);
    res.status(201).json({ succes: true, groupe_id: result.insertId, code: `CAM-${annee_hajj}-${String(result.insertId).padStart(3, '0')}` });
  } catch (error) { next(error); }
};

const modifierGroupe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable.' });
    if (!access.allowed || req.utilisateur.role === 'encadreur' || req.utilisateur.role === 'pelerin') return res.status(403).json({ succes: false, message: 'Accès refusé.' });

    const group = access.group;
    const targetAgency = req.utilisateur.role === 'agence' ? group.agence_id : (req.body.agence_id ?? group.agence_id);
    const targetGuide = req.body.encadreur_id === undefined ? group.encadreur_id : (req.body.encadreur_id || null);
    if (targetGuide) {
      const [guides] = await pool.execute('SELECT utilisateur_id FROM encadreurs WHERE utilisateur_id=? AND agence_id=?', [targetGuide, targetAgency]);
      if (!guides.length) return res.status(400).json({ succes: false, message: 'Le guide doit être rattaché à l’organisation du groupe.' });
    }
    if (req.body.agence_id && req.utilisateur.role === 'admin') {
      const [agencies] = await pool.execute('SELECT id FROM agences WHERE id=?', [targetAgency]);
      if (!agencies.length) return res.status(400).json({ succes: false, message: 'Organisation introuvable.' });
    }
    const [members] = await pool.execute('SELECT COUNT(*) AS total FROM groupe_membres WHERE groupe_id=?', [group.id]);
    const targetYear = req.body.annee_hajj ?? group.annee_hajj;
    if ((Number(targetYear) !== Number(group.annee_hajj) || Number(targetAgency) !== Number(group.agence_id)) && Number(members[0].total) > 0) {
      return res.status(409).json({ succes: false, message: 'Retirez ou déplacez les pèlerins avant de changer l’organisation ou la saison du groupe.' });
    }
    const targetName = req.body.nom ?? group.nom;
    await pool.execute('UPDATE groupes_pelerins SET nom=?,annee_hajj=?,agence_id=?,encadreur_id=? WHERE id=?', [targetName, targetYear, targetAgency, targetGuide, group.id]);
    res.json({ succes: true, message: 'Groupe mis à jour.', code: `CAM-${targetYear}-${String(group.id).padStart(3, '0')}` });
  } catch (error) { next(error); }
};

const ajouterMembre = async (req, res, next) => {
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed || req.utilisateur.role === 'pelerin') return res.status(403).json({ succes: false, message: 'Accès refusé' });
    const [pilgrim] = await pool.execute("SELECT id FROM utilisateurs WHERE id=? AND role='pelerin'", [req.body.pelerin_id]);
    if (!pilgrim.length) return res.status(400).json({ succes: false, message: 'Pèlerin introuvable' });
    const [membership] = await pool.execute(
      `SELECT g.id,g.nom FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id
       WHERE gm.pelerin_id=? AND g.annee_hajj=? AND g.id<>? LIMIT 1`,
      [req.body.pelerin_id, access.group.annee_hajj, req.params.id]
    );
    if (membership.length) return res.status(409).json({ succes: false, message: `Ce pèlerin appartient déjà au groupe ${membership[0].nom}. Utilisez l’action déplacer.` });
    await pool.execute('INSERT IGNORE INTO groupe_membres (groupe_id,pelerin_id) VALUES (?,?)', [req.params.id, req.body.pelerin_id]);
    res.status(201).json({ succes: true });
  } catch (error) { next(error); }
};

const retirerMembre = async (req, res, next) => {
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable.' });
    if (!access.allowed || req.utilisateur.role === 'pelerin') return res.status(403).json({ succes: false, message: 'Accès refusé.' });
    const [result] = await pool.execute('DELETE FROM groupe_membres WHERE groupe_id=? AND pelerin_id=?', [req.params.id, req.params.pelerinId]);
    if (!result.affectedRows) return res.status(404).json({ succes: false, message: 'Ce pèlerin ne fait pas partie du groupe.' });
    res.json({ succes: true, message: 'Pèlerin retiré du groupe.' });
  } catch (error) { next(error); }
};

const deplacerMembre = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const sourceId = Number(req.body.source_groupe_id);
    const targetId = Number(req.params.id);
    if (!sourceId || sourceId === targetId) return res.status(400).json({ succes: false, message: 'Groupe source invalide.' });
    const sourceAccess = await canAccessGroup(req.utilisateur, sourceId);
    const targetAccess = await canAccessGroup(req.utilisateur, targetId);
    if (!sourceAccess.group || !targetAccess.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable.' });
    if (!sourceAccess.allowed || !targetAccess.allowed || req.utilisateur.role === 'pelerin') return res.status(403).json({ succes: false, message: 'Accès refusé.' });
    if (Number(sourceAccess.group.annee_hajj) !== Number(targetAccess.group.annee_hajj) || Number(sourceAccess.group.agence_id) !== Number(targetAccess.group.agence_id)) {
      return res.status(409).json({ succes: false, message: 'Le déplacement est limité aux groupes de la même organisation et de la même saison.' });
    }

    await connection.beginTransaction();
    const [sourceMembership] = await connection.execute('SELECT pelerin_id FROM groupe_membres WHERE groupe_id=? AND pelerin_id=? FOR UPDATE', [sourceId, req.params.pelerinId]);
    if (!sourceMembership.length) {
      await connection.rollback();
      return res.status(404).json({ succes: false, message: 'Ce pèlerin ne fait pas partie du groupe source.' });
    }
    await connection.execute('INSERT INTO groupe_membres (groupe_id,pelerin_id) VALUES (?,?)', [targetId, req.params.pelerinId]);
    await connection.execute('DELETE FROM groupe_membres WHERE groupe_id=? AND pelerin_id=?', [sourceId, req.params.pelerinId]);
    await connection.commit();
    res.json({ succes: true, message: 'Pèlerin déplacé.' });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ succes: false, message: 'Ce pèlerin est déjà dans le groupe cible.' });
    next(error);
  } finally { connection.release(); }
};

const realtime = require('../services/realtime');
const { envoyerNotification } = require('../services/notificationService');

/**
 * Un nouveau message n'apparaît PAS dans « Notifications » : il est signalé sur « Mon groupe » (compteur de non lus)
 * par le temps réel (alerte + badge) et, si le téléphone est enregistré, par un push. L'admin n'est jamais prévenu.
 */
async function notifyGroupMessage(group, sender, content, hasMedia) {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.fcm_token FROM utilisateurs u WHERE u.est_actif=TRUE AND u.role<>'admin' AND u.id<>? AND (
         u.id IN (SELECT pelerin_id FROM groupe_membres WHERE groupe_id=?) OR u.id=? OR u.id=(SELECT utilisateur_id FROM agences WHERE id=?))`,
      [sender.id, group.id, group.encadreur_id || 0, group.agence_id]);
    const preview = (content || '').slice(0, 140) || (hasMedia ? '📎 Pièce jointe' : '');
    const payload = { titre: `Nouveau message · ${group.nom}`, corps: `${sender.prenom} ${sender.nom} : ${preview}`, groupe_id: Number(group.id), appel: /^(📞|🎥)/.test(preview) };
    for (const user of rows) {
      realtime.toUser(user.id, 'group:unread', payload);
      envoyerNotification(user.fcm_token, payload.titre, payload.corps);
    }
  } catch (error) { console.warn('[chat] alerte non envoyée :', error.message); }
}

/** L'encadreur (ou l'agence) lance un appel audio ou visio dans le groupe : un message « appel » est publié et tous les membres sont alertés. */
const demarrerAppel = async (req, res, next) => {
  try {
    const kind = req.body.type === 'audio' ? 'audio' : req.body.type === 'video' ? 'video' : null;
    if (!kind) return res.status(400).json({ succes: false, message: 'Type d’appel invalide (audio ou video).' });
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed || !['encadreur', 'agence', 'admin'].includes(req.utilisateur.role)) return res.status(403).json({ succes: false, message: 'Seul l’encadreur du groupe peut lancer un appel.' });
    await pool.execute("UPDATE messages_groupes SET media_type='call/ended' WHERE groupe_id=? AND media_type IN ('call/audio','call/video')", [req.params.id]); // un seul appel actif à la fois
    const room = `hajjflow-g${req.params.id}-${require('crypto').randomBytes(6).toString('hex')}`;
    const url = `https://${process.env.JITSI_DOMAIN || 'meet.jit.si'}/${room}`;
    const label = kind === 'audio' ? '📞 Appel audio en cours' : '🎥 Appel vidéo en cours';
    const [result] = await pool.execute('INSERT INTO messages_groupes (groupe_id,expediteur_id,contenu,media_url,media_nom,media_type) VALUES (?,?,?,?,?,?)', [req.params.id, req.utilisateur.id, label, url, room, `call/${kind}`]);
    realtime.toGroup(req.params.id, 'group:message', { groupe_id: Number(req.params.id), id: result.insertId });
    realtime.toGroup(req.params.id, 'group:call', { groupe_id: Number(req.params.id), type: kind, url, par: `${req.utilisateur.prenom} ${req.utilisateur.nom}` });
    await notifyGroupMessage(access.group, req.utilisateur, label, false);
    res.status(201).json({ succes: true, message_id: result.insertId, type: kind, url });
  } catch (error) { next(error); }
};

const terminerAppel = async (req, res, next) => {
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed || !['encadreur', 'agence', 'admin'].includes(req.utilisateur.role)) return res.status(403).json({ succes: false, message: 'Accès refusé' });
    await pool.execute("UPDATE messages_groupes SET media_type='call/ended', contenu='📴 Appel terminé' WHERE groupe_id=? AND media_type IN ('call/audio','call/video')", [req.params.id]);
    realtime.toGroup(req.params.id, 'group:message', { groupe_id: Number(req.params.id) });
    res.json({ succes: true });
  } catch (error) { next(error); }
};

/** Messages non lus par groupe pour l'utilisateur connecté. */
const nonLus = async (req, res, next) => {
  try {
    const { role, id } = req.utilisateur;
    let scope = '1=0'; const params = [id, id];
    if (role === 'pelerin') { scope = 'g.id IN (SELECT groupe_id FROM groupe_membres WHERE pelerin_id=?)'; params.push(id); }
    else if (role === 'encadreur') { scope = 'g.encadreur_id=?'; params.push(id); }
    else if (role === 'agence') { scope = 'g.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)'; params.push(id); }
    const [items] = await pool.execute(
      `SELECT g.id AS groupe_id, g.nom, (SELECT COUNT(*) FROM messages_groupes m WHERE m.groupe_id=g.id AND m.expediteur_id<>? AND m.id > COALESCE((SELECT l.dernier_id FROM groupe_lectures l WHERE l.groupe_id=g.id AND l.utilisateur_id=?),0)) AS non_lus
       FROM groupes_pelerins g WHERE ${scope}`, params);
    const list = items.map((row) => ({ ...row, non_lus: Number(row.non_lus) }));
    res.json({ succes: true, items: list, total: list.reduce((sum, row) => sum + row.non_lus, 0) });
  } catch (error) { next(error); }
};

/** Marque la discussion comme lue (jusqu'au dernier message actuel). */
const marquerLu = async (req, res, next) => {
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed) return res.status(403).json({ succes: false, message: 'Accès refusé' });
    await pool.execute(
      `INSERT INTO groupe_lectures (groupe_id, utilisateur_id, dernier_id) VALUES (?,?,COALESCE((SELECT MAX(id) FROM messages_groupes WHERE groupe_id=?),0))
       ON DUPLICATE KEY UPDATE dernier_id=VALUES(dernier_id)`, [req.params.id, req.utilisateur.id, req.params.id]);
    res.json({ succes: true });
  } catch (error) { next(error); }
};

const listerMessages = async (req, res, next) => {
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed) return res.status(403).json({ succes: false, message: 'Accès refusé' });
    const [messages] = await pool.execute(`SELECT m.id,m.groupe_id,m.contenu,m.media_url,m.media_nom,m.media_type,m.media_taille,m.cree_le,m.expediteur_id,CONCAT(u.prenom,' ',u.nom) AS expediteur_nom FROM messages_groupes m JOIN utilisateurs u ON u.id=m.expediteur_id WHERE m.groupe_id=? ORDER BY m.cree_le ASC`, [req.params.id]);
    res.json({ succes: true, messages });
  } catch (error) { next(error); }
};

const envoyerMessage = (req, res, next) => upload(req, res, async (uploadError) => {
  if (uploadError) return res.status(400).json({ succes: false, message: uploadError.code === 'LIMIT_FILE_SIZE' ? 'Média trop volumineux (50 Mo maximum).' : 'Type de média non supporté.' });
  try {
    const access = await canAccessGroup(req.utilisateur, req.params.id);
    if (!access.group) return res.status(404).json({ succes: false, message: 'Groupe introuvable' });
    if (!access.allowed) return res.status(403).json({ succes: false, message: 'Accès refusé' });
    const contenu = String(req.body.contenu || '').trim() || null;
    if (!contenu && !req.file) return res.status(400).json({ succes: false, message: 'Le message ou un média est requis.' });
    const mediaUrl = req.file ? `/uploads/chat/${path.basename(req.file.path)}` : null;
    const [result] = await pool.execute('INSERT INTO messages_groupes (groupe_id,expediteur_id,contenu,media_url,media_nom,media_type,media_taille) VALUES (?,?,?,?,?,?,?)', [req.params.id, req.utilisateur.id, contenu, mediaUrl, req.file?.originalname || null, req.file?.mimetype || null, req.file?.size || null]);
    realtime.toGroup(req.params.id, 'group:message', { groupe_id: Number(req.params.id), id: result.insertId });
    await notifyGroupMessage(access.group, req.utilisateur, contenu, Boolean(req.file));
    res.status(201).json({ succes: true, message_id: result.insertId });
  } catch (error) { if (req.file) fs.unlink(req.file.path, () => {}); next(error); }
});

module.exports = { demarrerAppel, terminerAppel, nonLus, marquerLu, canAccessGroup, listerGroupes, listerGuides, listerPelerins, obtenirGroupe, creerGroupe, modifierGroupe, ajouterMembre, retirerMembre, deplacerMembre, listerMessages, envoyerMessage };
