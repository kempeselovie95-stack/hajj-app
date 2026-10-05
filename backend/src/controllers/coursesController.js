/**
 * Cours proposés aux pèlerins : titre, image de couverture, nombre de pages, support téléchargeable, favoris.
 * - Guide : crée / modifie / publie / annule SES cours (pour un de ses groupes ou toute l'agence).
 * - Agence : idem pour son organisation. Admin plateforme : pour une agence, un groupe, ou toutes les agences.
 * - Pèlerin : voit les cours publiés qui le concernent, s'y inscrit, les met en favoris, télécharge le support.
 */
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { pool } = require('../config/database');
const { audit } = require('../services/audit');

const CATEGORIES = ['RITUALS', 'HEALTH', 'LANGUAGE', 'LOGISTICS', 'OTHER'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'];
const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;

const COVER_DIR = path.resolve(__dirname, '../uploads/courses');          // public : simples images de couverture
const FILE_DIR = path.resolve(__dirname, '../private/courses');           // privé : support téléchargeable via lien signé
fs.mkdirSync(COVER_DIR, { recursive: true });
fs.mkdirSync(FILE_DIR, { recursive: true });

const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FILE_TYPES = new Set(['application/pdf']);
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm']);
const randomName = (original) => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(original).toLowerCase()}`;

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, callback) => callback(null, file.fieldname === 'cover' ? COVER_DIR : FILE_DIR),
    filename: (_req, file, callback) => callback(null, randomName(file.originalname)),
  }),
  limits: { fileSize: 60 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, callback) => callback(null, file.fieldname === 'cover' ? COVER_TYPES.has(file.mimetype) : file.fieldname === 'file' ? FILE_TYPES.has(file.mimetype) : file.fieldname === 'audio' ? AUDIO_TYPES.has(file.mimetype) : false),
}).fields([{ name: 'cover', maxCount: 1 }, { name: 'file', maxCount: 1 }, { name: 'audio', maxCount: 1 }]);

/** Middleware : lit un éventuel envoi multipart (cover, file) ; un corps JSON passe tel quel. */
const parseUploads = (req, res, next) => upload(req, res, (error) => {
  if (!error) return next();
  res.status(400).json({ succes: false, code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (60 Mo maximum).' : 'Fichier invalide.' });
});

const fail = (res, status, code, message, extra = {}) => res.status(status).json({ succes: false, code, message, ...extra });
const unlink = (dir, name) => { if (name) fs.unlink(path.join(dir, path.basename(name)), () => {}); };
const cleanupUploaded = (req) => { for (const file of [...(req.files?.cover ?? []), ...(req.files?.file ?? []), ...(req.files?.audio ?? [])]) fs.unlink(file.path, () => {}); };

const FAV = 'EXISTS(SELECT 1 FROM cours_favoris f WHERE f.cours_id=c.id AND f.utilisateur_id=?)';
const ENR = 'EXISTS(SELECT 1 FROM cours_inscriptions i WHERE i.cours_id=c.id AND i.pelerin_id=?)';
const SELECT = `c.id, c.agence_id, c.encadreur_id, c.groupe_id, c.titre, c.description, c.categorie,
  DATE_FORMAT(c.debut_le,'%Y-%m-%dT%H:%i') AS debut_le, c.duree_minutes, c.lieu, c.lien_visio, c.support_url, c.statut, c.nb_pages,
  IF(c.cover_path IS NULL, NULL, CONCAT('/uploads/courses/', c.cover_path)) AS cover_url,
  (c.fichier_path IS NOT NULL) AS a_fichier, c.fichier_nom, c.fichier_taille, (c.audio_path IS NOT NULL) AS a_audio, c.audio_nom,
  (c.contenu IS NOT NULL AND c.contenu<>'') AS a_contenu,
  (SELECT g.nom FROM groupes_pelerins g WHERE g.id=c.groupe_id) AS groupe_nom,
  (SELECT CONCAT(u.prenom,' ',u.nom) FROM utilisateurs u WHERE u.id=c.encadreur_id) AS encadreur_nom,
  (SELECT COUNT(*) FROM cours_inscriptions i WHERE i.cours_id=c.id) AS inscrits,
  (SELECT COUNT(*) FROM cours_favoris f WHERE f.cours_id=c.id) AS nb_favoris,
  ${ENR} AS inscrit, ${FAV} AS favori`;

const present = (row) => ({ ...row, inscrit: Boolean(row.inscrit), favori: Boolean(row.favori), a_fichier: Boolean(row.a_fichier), a_audio: Boolean(row.a_audio), a_contenu: Boolean(row.a_contenu), inscrits: Number(row.inscrits), nb_favoris: Number(row.nb_favoris) });

// ───────────────────────── Validation ─────────────────────────

function parseBody(body, partial) {
  const errors = [];
  const values = {};
  const text = (name, max, required) => {
    if (body[name] === undefined) { if (!partial && required) errors.push({ champ: name, code: 'required' }); return; }
    const value = body[name] === null ? '' : String(body[name]).trim();
    if (!value) { if (required) errors.push({ champ: name, code: 'required' }); else values[name] = null; return; }
    if (value.length > max) { errors.push({ champ: name, code: 'too_long' }); return; }
    values[name] = value;
  };
  const url = (name) => {
    text(name, 500, false);
    if (values[name] && !URL_RE.test(values[name])) errors.push({ champ: name, code: 'invalid_url' });
  };
  text('titre', 200, true); text('description', 4000, false); text('contenu', 60000, false); text('lieu', 200, false); url('lien_visio'); url('support_url');
  if (body.categorie !== undefined) { if (CATEGORIES.includes(body.categorie)) values.categorie = body.categorie; else errors.push({ champ: 'categorie', code: 'invalid_choice' }); }
  if (body.statut !== undefined) { if (STATUSES.includes(body.statut)) values.statut = body.statut; else errors.push({ champ: 'statut', code: 'invalid_choice' }); }
  if (body.debut_le === undefined) { if (!partial) errors.push({ champ: 'debut_le', code: 'required' }); }
  else {
    const match = DATETIME_RE.exec(String(body.debut_le));
    if (!match || Number.isNaN(new Date(`${match[1]}T${match[2]}:00Z`).getTime())) errors.push({ champ: 'debut_le', code: 'invalid_datetime' });
    else values.debut_le = `${match[1]} ${match[2]}:${match[3] ?? '00'}`;
  }
  if (body.duree_minutes !== undefined && body.duree_minutes !== '') {
    const minutes = Number(body.duree_minutes);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) errors.push({ champ: 'duree_minutes', code: 'invalid_number' });
    else values.duree_minutes = minutes;
  }
  if (body.nb_pages !== undefined) {
    if (body.nb_pages === null || body.nb_pages === '') values.nb_pages = null;
    else {
      const pages = Number(body.nb_pages);
      if (!Number.isInteger(pages) || pages < 1 || pages > 5000) errors.push({ champ: 'nb_pages', code: 'invalid_number' });
      else values.nb_pages = pages;
    }
  }
  for (const name of ['groupe_id', 'agence_id']) {
    if (body[name] === undefined) continue;
    if (body[name] === null || body[name] === '') values[name] = null;
    else if (Number.isInteger(Number(body[name])) && Number(body[name]) > 0) values[name] = Number(body[name]);
    else errors.push({ champ: name, code: 'invalid_number' });
  }
  return { values, errors };
}

/** Nombre de pages d'un PDF (comptage des objets /Type /Page) ; null si indéterminé. */
function countPdfPages(filePath) {
  try {
    const content = fs.readFileSync(filePath).toString('latin1');
    const count = (content.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    return count > 0 && count <= 5000 ? count : null;
  } catch { return null; }
}

// ───────────────────────── Périmètre ─────────────────────────

async function guideAgency(userId) {
  const [rows] = await pool.execute('SELECT agence_id FROM encadreurs WHERE utilisateur_id=?', [userId]);
  return rows[0]?.agence_id ?? null;
}

async function agencyIds(user) {
  if (user.role === 'admin') return null;
  if (user.role === 'encadreur') return [await guideAgency(user.id)].filter(Boolean);
  const [rows] = await pool.execute('SELECT id FROM agences WHERE utilisateur_id=?', [user.id]);
  return rows.map((row) => row.id);
}

/** Pèlerins destinataires : membres du groupe, sinon pèlerins de l'agence, sinon (cours global) tous les pèlerins. */
async function recipients(course) {
  if (course.groupe_id) return (await pool.execute('SELECT pelerin_id AS id FROM groupe_membres WHERE groupe_id=?', [course.groupe_id]))[0].map((row) => row.id);
  if (course.agence_id) return (await pool.execute("SELECT DISTINCT pelerin_id AS id FROM dossiers WHERE agence_id=? AND statut<>'annule'", [course.agence_id]))[0].map((row) => row.id);
  return (await pool.execute("SELECT id FROM utilisateurs WHERE role='pelerin' AND est_actif=TRUE"))[0].map((row) => row.id);
}

async function notify(userIds, title, body) {
  if (!userIds.length) return;
  for (let start = 0; start < userIds.length; start += 500) {
    const chunk = userIds.slice(start, start + 500);
    await pool.execute(`INSERT INTO notifications (destinataire_id, titre, corps, type) VALUES ${chunk.map(() => '(?,?,?,?)').join(',')}`, chunk.flatMap((id) => [id, title, body.slice(0, 1000), 'info']));
  }
}

const when = (value) => String(value).replace('T', ' ').slice(0, 16);

async function fetchOne(id, viewerId) {
  const [rows] = await pool.execute(`SELECT ${SELECT} FROM cours c WHERE c.id=?`, [viewerId, viewerId, id]);
  return rows[0] ? present(rows[0]) : null;
}

const PILGRIM_VISIBLE = `c.statut IN ('PUBLISHED','CANCELLED') AND (c.groupe_id IN (SELECT groupe_id FROM groupe_membres WHERE pelerin_id=?)
  OR (c.groupe_id IS NULL AND (c.agence_id IS NULL OR c.agence_id IN (SELECT agence_id FROM dossiers WHERE pelerin_id=? AND agence_id IS NOT NULL))))`;

/** Le cours est-il accessible à cet utilisateur (lecture) ? */
async function canView(user, course) {
  if (user.role === 'pelerin') {
    if (course.statut === 'DRAFT') return false;
    const [rows] = await pool.execute(`SELECT c.id FROM cours c WHERE c.id=? AND ${PILGRIM_VISIBLE}`, [course.id, user.id, user.id]);
    return rows.length > 0;
  }
  if (user.role === 'admin') return true;
  if (user.role === 'encadreur' && Number(course.encadreur_id) === Number(user.id)) return true;
  const ids = await agencyIds(user);
  return course.agence_id == null || ids.map(Number).includes(Number(course.agence_id));
}

/** Le cours est-il modifiable ? Guide : le sien ; agence : celui de son organisation ; admin : tous. */
async function canManage(user, course) {
  if (user.role === 'admin') return true;
  if (user.role === 'encadreur') return Number(course.encadreur_id) === Number(user.id);
  if (user.role === 'agence') return course.agence_id != null && (await agencyIds(user)).map(Number).includes(Number(course.agence_id));
  return false;
}

// ───────────────────────── Lecture ─────────────────────────

const listCourses = async (req, res, next) => {
  try {
    const user = req.utilisateur;
    const params = [user.id, user.id];
    let where;
    if (user.role === 'pelerin') { where = PILGRIM_VISIBLE; params.push(user.id, user.id); }
    else if (user.role === 'admin') where = '1=1';
    else if (user.role === 'encadreur') { where = 'c.encadreur_id=?'; params.push(user.id); }
    else {
      const ids = await agencyIds(user);
      if (!ids.length) where = 'c.agence_id IS NULL';
      else { where = `(c.agence_id IN (${ids.map(() => '?').join(',')}) OR c.agence_id IS NULL)`; params.push(...ids); }
    }
    if (req.query.a_venir === '1') where += ' AND c.debut_le >= UTC_TIMESTAMP() - INTERVAL 1 DAY';
    if (req.query.favoris === '1') { where += ` AND ${FAV}`; params.push(user.id); }
    const [rows] = await pool.execute(`SELECT ${SELECT} FROM cours c WHERE ${where} ORDER BY c.debut_le ASC LIMIT 300`, params);
    res.json({ succes: true, items: rows.map(present) });
  } catch (error) { next(error); }
};

// ───────────────────────── Écriture ─────────────────────────

/** Détermine l'agence et vérifie le groupe selon le rôle. Retourne { agence_id } ou { error }. */
async function resolveScope(user, values, current = null) {
  const groupId = values.groupe_id !== undefined ? values.groupe_id : current?.groupe_id ?? null;
  let group = null;
  if (groupId != null) {
    const [rows] = await pool.execute('SELECT id, agence_id, encadreur_id FROM groupes_pelerins WHERE id=?', [groupId]);
    group = rows[0];
    if (!group) return { error: 'groupe_id' };
  }
  if (user.role === 'encadreur') {
    if (group && Number(group.encadreur_id) !== Number(user.id)) return { error: 'groupe_id' };
    return { agence_id: await guideAgency(user.id) };
  }
  if (user.role === 'agence') {
    const ids = await agencyIds(user);
    if (group && !ids.map(Number).includes(Number(group.agence_id))) return { error: 'groupe_id' };
    const requested = values.agence_id !== undefined ? values.agence_id : current?.agence_id;
    if (requested != null && !ids.map(Number).includes(Number(requested))) return { error: 'agence_id' };
    return { agence_id: group ? group.agence_id : requested ?? ids[0] ?? null };
  }
  // admin plateforme : agence choisie, ou celle du groupe, ou aucune (cours pour toutes les agences)
  const requested = values.agence_id !== undefined ? values.agence_id : current?.agence_id ?? null;
  if (group) return { agence_id: group.agence_id };
  if (requested != null) {
    const [rows] = await pool.execute('SELECT id FROM agences WHERE id=?', [requested]);
    if (!rows.length) return { error: 'agence_id' };
  }
  return { agence_id: requested };
}

function attachFiles(req, data) {
  const cover = req.files?.cover?.[0];
  const file = req.files?.file?.[0];
  const audio = req.files?.audio?.[0];
  if (cover) data.cover_path = cover.filename;
  if (audio) { data.audio_path = audio.filename; data.audio_nom = (audio.originalname || audio.filename).slice(0, 255); }
  if (file) {
    data.fichier_path = file.filename;
    data.fichier_nom = (file.originalname || file.filename).slice(0, 255);
    data.fichier_taille = file.size;
    if (data.nb_pages == null) data.nb_pages = countPdfPages(file.path);
  }
}

const createCourse = async (req, res, next) => {
  try {
    const { values, errors } = parseBody(req.body || {}, false);
    if (errors.length) { cleanupUploaded(req); return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: errors }); }
    const scope = await resolveScope(req.utilisateur, values);
    if (scope.error) { cleanupUploaded(req); return fail(res, scope.error === 'groupe_id' ? 400 : 403, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: scope.error, code: 'invalid_reference' }] }); }
    if (req.utilisateur.role === 'encadreur' && !scope.agence_id) { cleanupUploaded(req); return fail(res, 403, 'NO_AGENCY', 'Aucune agence associée à ce guide'); }
    const data = { statut: 'PUBLISHED', categorie: 'OTHER', duree_minutes: 60, ...values, agence_id: scope.agence_id, encadreur_id: req.utilisateur.id };
    attachFiles(req, data);
    const names = Object.keys(data);
    const [result] = await pool.execute(`INSERT INTO cours (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`, names.map((n) => data[n] ?? null));
    const course = await fetchOne(result.insertId, req.utilisateur.id);
    if (course.statut === 'PUBLISHED') await notify(await recipients(course), `Nouveau cours : ${course.titre}`, `${course.encadreur_nom} propose « ${course.titre} » le ${when(course.debut_le)}${course.lieu ? ` — ${course.lieu}` : ''}.`);
    await audit(req, 'create', 'cours', result.insertId, { titre: course.titre, statut: course.statut });
    res.status(201).json({ succes: true, item: course });
  } catch (error) { cleanupUploaded(req); next(error); }
};

async function loadManaged(req, res) {
  const course = await fetchOne(Number(req.params.id), req.utilisateur.id);
  if (!course || !(await canManage(req.utilisateur, course))) { cleanupUploaded(req); fail(res, 404, 'NOT_FOUND', 'Cours introuvable'); return null; }
  return course;
}

const updateCourse = async (req, res, next) => {
  try {
    const before = await loadManaged(req, res);
    if (!before) return;
    const { values, errors } = parseBody(req.body || {}, true);
    if (errors.length) { cleanupUploaded(req); return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: errors }); }
    const touchesScope = values.groupe_id !== undefined || values.agence_id !== undefined;
    if (touchesScope) {
      const scope = await resolveScope(req.utilisateur, values, before);
      if (scope.error) { cleanupUploaded(req); return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: scope.error, code: 'invalid_reference' }] }); }
      values.agence_id = scope.agence_id;
    }
    const [[old]] = await pool.execute('SELECT cover_path, fichier_path, audio_path FROM cours WHERE id=?', [before.id]);
    const data = { ...values };
    attachFiles(req, data);
    if (req.body.remove_cover === '1' || req.body.remove_cover === 'true') data.cover_path = null;
    if (req.body.remove_file === '1' || req.body.remove_file === 'true') { data.fichier_path = null; data.fichier_nom = null; data.fichier_taille = null; }
    if (req.body.remove_audio === '1' || req.body.remove_audio === 'true') { data.audio_path = null; data.audio_nom = null; }
    const names = Object.keys(data);
    if (!names.length) return fail(res, 400, 'VALIDATION_ERROR', 'Aucune modification fournie');
    await pool.execute(`UPDATE cours SET ${names.map((n) => `${n}=?`).join(',')} WHERE id=?`, [...names.map((n) => data[n] ?? null), before.id]);
    if ('cover_path' in data) unlink(COVER_DIR, old.cover_path);
    if ('fichier_path' in data) unlink(FILE_DIR, old.fichier_path);
    if ('audio_path' in data) unlink(FILE_DIR, old.audio_path);
    const after = await fetchOne(before.id, req.utilisateur.id);
    if (after.statut === 'PUBLISHED' && before.statut !== 'PUBLISHED') {
      await notify(await recipients(after), `Nouveau cours : ${after.titre}`, `${after.encadreur_nom} propose « ${after.titre} » le ${when(after.debut_le)}${after.lieu ? ` — ${after.lieu}` : ''}.`);
    } else if (after.statut === 'CANCELLED' && before.statut !== 'CANCELLED') {
      await notify(await recipients(after), `Cours annulé : ${after.titre}`, `Le cours prévu le ${when(before.debut_le)} est annulé.`);
    } else if (after.statut === 'PUBLISHED' && (after.debut_le !== before.debut_le || after.lieu !== before.lieu)) {
      await notify(await recipients(after), `Cours modifié : ${after.titre}`, `Nouveau créneau : ${when(after.debut_le)}${after.lieu ? ` — ${after.lieu}` : ''}.`);
    }
    await audit(req, 'update', 'cours', before.id, values);
    res.json({ succes: true, item: after });
  } catch (error) { cleanupUploaded(req); next(error); }
};

const deleteCourse = async (req, res, next) => {
  try {
    const course = await loadManaged(req, res);
    if (!course) return;
    if (course.statut === 'PUBLISHED' && course.inscrits > 0) return fail(res, 409, 'HAS_PARTICIPANTS', 'Annule le cours plutôt que de le supprimer : des pèlerins y sont inscrits.');
    const [[old]] = await pool.execute('SELECT cover_path, fichier_path, audio_path FROM cours WHERE id=?', [course.id]);
    await pool.execute('DELETE FROM cours WHERE id=?', [course.id]);
    unlink(COVER_DIR, old?.cover_path); unlink(FILE_DIR, old?.fichier_path); unlink(FILE_DIR, old?.audio_path);
    await audit(req, 'delete', 'cours', course.id);
    res.json({ succes: true });
  } catch (error) { next(error); }
};

const listParticipants = async (req, res, next) => {
  try {
    const course = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!course || !(await canManage(req.utilisateur, course) || (req.utilisateur.role !== 'pelerin' && (await canView(req.utilisateur, course))))) return fail(res, 404, 'NOT_FOUND', 'Cours introuvable');
    const [items] = await pool.execute(
      `SELECT u.id, u.prenom, u.nom, u.telephone FROM cours_inscriptions i JOIN utilisateurs u ON u.id=i.pelerin_id WHERE i.cours_id=? ORDER BY u.nom, u.prenom`, [course.id]);
    res.json({ succes: true, items });
  } catch (error) { next(error); }
};

// ───────────────────────── Pèlerin : inscription, favoris, téléchargement ─────────────────────────

const enroll = async (req, res, next) => {
  try {
    const course = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!course || course.statut !== 'PUBLISHED' || course.debut_le < new Date(Date.now() - 86400000).toISOString().slice(0, 16) || !(await canView(req.utilisateur, course))) return fail(res, 404, 'NOT_FOUND', 'Cours introuvable ou terminé');
    await pool.execute('INSERT IGNORE INTO cours_inscriptions (cours_id, pelerin_id) VALUES (?,?)', [course.id, req.utilisateur.id]);
    res.status(201).json({ succes: true, item: await fetchOne(course.id, req.utilisateur.id) });
  } catch (error) { next(error); }
};

const unenroll = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.execute('DELETE FROM cours_inscriptions WHERE cours_id=? AND pelerin_id=?', [id, req.utilisateur.id]);
    res.json({ succes: true, item: await fetchOne(id, req.utilisateur.id) });
  } catch (error) { next(error); }
};

const favorite = async (req, res, next) => {
  try {
    const course = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!course || !(await canView(req.utilisateur, course))) return fail(res, 404, 'NOT_FOUND', 'Cours introuvable');
    await pool.execute('INSERT IGNORE INTO cours_favoris (cours_id, utilisateur_id) VALUES (?,?)', [course.id, req.utilisateur.id]);
    res.status(201).json({ succes: true, item: await fetchOne(course.id, req.utilisateur.id) });
  } catch (error) { next(error); }
};

const unfavorite = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.execute('DELETE FROM cours_favoris WHERE cours_id=? AND utilisateur_id=?', [id, req.utilisateur.id]);
    res.json({ succes: true, item: await fetchOne(id, req.utilisateur.id) });
  } catch (error) { next(error); }
};

const jwtSecret = () => process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-me');

/**
 * Lien signé et éphémère (10 min) vers le support PDF ou l'audio du cours : utilisable par le navigateur / l'OS
 * sans en-tête Authorization. ?kind=file|audio (défaut file) et ?inline=1 pour une lecture dans l'application.
 */
const downloadLink = async (req, res, next) => {
  try {
    const kind = ['audio', 'text'].includes(req.query.kind) ? req.query.kind : 'file';
    const inline = req.query.inline === '1' || (kind === 'audio' && req.query.inline !== '0');
    const course = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!course || !(await canView(req.utilisateur, course))) return fail(res, 404, 'NOT_FOUND', 'Cours introuvable');
    // Le téléchargement est réservé aux pèlerins inscrits au cours (la lecture / l'écoute restent libres).
    if (!inline && req.utilisateur.role === 'pelerin' && !course.inscrit) return fail(res, 403, 'NOT_ENROLLED', 'Inscris-toi au cours pour pouvoir le télécharger');
    const available = kind === 'audio' ? course.a_audio : kind === 'text' ? course.a_contenu : course.a_fichier;
    if (!available) return fail(res, 404, 'NO_FILE', 'Aucun support à télécharger');
    const secret = jwtSecret();
    if (!secret) return fail(res, 500, 'CONFIG', 'JWT_SECRET non configuré');
    const token = jwt.sign({ typ: 'course-file', cid: course.id, uid: req.utilisateur.id, kind, inline }, secret, { expiresIn: '10m' });
    res.json({ succes: true, url: `/api/courses/${course.id}/download?token=${token}`, nom: kind === 'audio' ? course.audio_nom : kind === 'text' ? `${course.titre}.txt` : course.fichier_nom, taille: course.fichier_taille });
  } catch (error) { next(error); }
};

const downloadFile = async (req, res, next) => {
  try {
    const payload = jwt.verify(String(req.query.token || ''), jwtSecret() || '');
    if (payload.typ !== 'course-file' || Number(payload.cid) !== Number(req.params.id)) throw new Error('jeton invalide');
    const kind = ['audio', 'text'].includes(payload.kind) ? payload.kind : 'file';
    if (kind === 'text') {
      const [texts] = await pool.execute('SELECT titre, description, contenu FROM cours WHERE id=?', [Number(req.params.id)]);
      if (!texts.length || !texts[0].contenu) return fail(res, 404, 'NO_FILE', 'Fichier introuvable');
      const eol = String.fromCharCode(13, 10);
      const head = `${texts[0].titre}${eol}${'='.repeat(Math.min(60, texts[0].titre.length))}${eol}${eol}`;
      const intro = texts[0].description ? `${texts[0].description}${eol}${eol}` : '';
      const body = head + intro + String(texts[0].contenu).split(String.fromCharCode(10)).map((line) => line.replace(String.fromCharCode(13), '')).join(eol) + eol;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`${texts[0].titre}.txt`)}`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.send(String.fromCharCode(0xFEFF) + body);
    }
    const [rows] = await pool.execute(`SELECT ${kind === 'audio' ? 'audio_path AS chemin, audio_nom AS nom' : 'fichier_path AS chemin, fichier_nom AS nom'} FROM cours WHERE id=?`, [Number(req.params.id)]);
    if (!rows.length || !rows[0].chemin) return fail(res, 404, 'NO_FILE', 'Fichier introuvable');
    const filePath = path.join(FILE_DIR, path.basename(rows[0].chemin));
    if (!fs.existsSync(filePath)) return fail(res, 404, 'NO_FILE', 'Fichier introuvable');
    const safeName = encodeURIComponent(rows[0].nom || path.basename(filePath));
    res.setHeader('Content-Disposition', `${payload.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${safeName}`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.sendFile(filePath); // gère aussi les requêtes Range (lecture audio, PDF volumineux)
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.message === 'jeton invalide') return fail(res, 401, 'INVALID_LINK', 'Lien de téléchargement expiré ou invalide');
    next(error);
  }
};

/** Détail d'un cours (avec le texte complet à lire). */
const getCourse = async (req, res, next) => {
  try {
    const course = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!course || !(await canView(req.utilisateur, course))) return fail(res, 404, 'NOT_FOUND', 'Cours introuvable');
    const [[row]] = await pool.execute('SELECT contenu FROM cours WHERE id=?', [course.id]);
    res.json({ succes: true, item: { ...course, contenu: row?.contenu ?? null } });
  } catch (error) { next(error); }
};

module.exports = { getCourse, parseUploads, listCourses, createCourse, updateCourse, deleteCourse, listParticipants, enroll, unenroll, favorite, unfavorite, downloadLink, downloadFile };
