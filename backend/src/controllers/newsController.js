/**
 * Actualités du pèlerinage (format « réels ») : texte, image ou vidéo, avec « j'aime ».
 * Publiées par l'administrateur (pour tous) ou par une agence (pour ses pèlerins).
 */
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { pool } = require('../config/database');
const { audit } = require('../services/audit');

const MEDIA_DIR = path.resolve(__dirname, '../uploads/news');
fs.mkdirSync(MEDIA_DIR, { recursive: true });
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const CATEGORIES = ['NEWS', 'GUIDANCE', 'HEALTH', 'TRAVEL', 'OTHER'];
const STATUSES = ['PUBLISHED', 'HIDDEN'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, MEDIA_DIR),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 60 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, IMAGE_TYPES.has(file.mimetype) || VIDEO_TYPES.has(file.mimetype)),
}).single('media');

const parseUpload = (req, res, next) => upload(req, res, (error) => {
  if (!error) return next();
  res.status(400).json({ succes: false, code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (60 Mo maximum).' : 'Fichier invalide.' });
});

const realtime = require('../services/realtime');
const fail = (res, status, code, message, extra = {}) => res.status(status).json({ succes: false, code, message, ...extra });
const unlinkMedia = (name) => { if (name) fs.unlink(path.join(MEDIA_DIR, path.basename(name)), () => {}); };
const cleanup = (req) => { if (req.file) fs.unlink(req.file.path, () => {}); };

const SELECT = `n.id, n.auteur_id, n.agence_id, n.titre, n.contenu, n.categorie, n.media_type, n.statut,
  COALESCE(n.image_url, IF(n.media_path IS NULL, NULL, CONCAT('/uploads/news/', n.media_path))) AS media_url, n.source_url, n.source_nom,
  DATE_FORMAT(n.cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le,
  (SELECT CONCAT(u.prenom,' ',u.nom) FROM utilisateurs u WHERE u.id=n.auteur_id) AS auteur_nom,
  (SELECT COUNT(*) FROM actualites_likes l WHERE l.actualite_id=n.id) AS likes,
  EXISTS(SELECT 1 FROM actualites_likes l WHERE l.actualite_id=n.id AND l.utilisateur_id=?) AS aime`;
const present = (row) => ({ ...row, likes: Number(row.likes), aime: Boolean(row.aime) });

async function agencyIds(user) {
  if (user.role === 'admin') return null;
  if (user.role === 'encadreur') return (await pool.execute('SELECT agence_id AS id FROM encadreurs WHERE utilisateur_id=?', [user.id]))[0].map((row) => row.id);
  if (user.role === 'pelerin') return (await pool.execute('SELECT DISTINCT agence_id AS id FROM dossiers WHERE pelerin_id=? AND agence_id IS NOT NULL', [user.id]))[0].map((row) => row.id);
  return (await pool.execute('SELECT id FROM agences WHERE utilisateur_id=?', [user.id]))[0].map((row) => row.id);
}

async function fetchOne(id, viewerId) {
  const [rows] = await pool.execute(`SELECT ${SELECT} FROM actualites n WHERE n.id=?`, [viewerId, id]);
  return rows[0] ? present(rows[0]) : null;
}

async function canView(user, item) {
  if (user.role === 'admin') return true;
  if (item.statut !== 'PUBLISHED' && !['agence'].includes(user.role)) return false;
  if (item.agence_id == null) return true;
  return (await agencyIds(user)).map(Number).includes(Number(item.agence_id));
}

async function canManage(user, item) {
  if (user.role === 'admin') return true;
  if (user.role !== 'agence' || item.agence_id == null) return false;
  return (await agencyIds(user)).map(Number).includes(Number(item.agence_id));
}

const listNews = async (req, res, next) => {
  try {
    const user = req.utilisateur;
    const params = [user.id];
    let where;
    if (user.role === 'admin') where = '1=1';
    else {
      const ids = await agencyIds(user);
      const scope = ids.length ? `(n.agence_id IS NULL OR n.agence_id IN (${ids.map(() => '?').join(',')}))` : 'n.agence_id IS NULL';
      params.push(...ids);
      where = user.role === 'agence' ? scope : `n.statut='PUBLISHED' AND ${scope}`;
    }
    const [rows] = await pool.execute(`SELECT ${SELECT} FROM actualites n WHERE ${where} ORDER BY n.cree_le DESC, n.id DESC LIMIT 100`, params);
    res.json({ succes: true, items: rows.map(present) });
  } catch (error) { next(error); }
};

function parseBody(body, partial) {
  const errors = []; const values = {};
  if (body.titre !== undefined) { const title = String(body.titre).trim(); if (!title || title.length > 200) errors.push({ champ: 'titre', code: title ? 'too_long' : 'required' }); else values.titre = title; }
  else if (!partial) errors.push({ champ: 'titre', code: 'required' });
  if (body.contenu !== undefined) { const text = String(body.contenu).trim(); if (text.length > 5000) errors.push({ champ: 'contenu', code: 'too_long' }); else values.contenu = text || null; }
  if (body.categorie !== undefined) { if (CATEGORIES.includes(body.categorie)) values.categorie = body.categorie; else errors.push({ champ: 'categorie', code: 'invalid_choice' }); }
  if (body.statut !== undefined) { if (STATUSES.includes(body.statut)) values.statut = body.statut; else errors.push({ champ: 'statut', code: 'invalid_choice' }); }
  if (body.agence_id !== undefined) {
    if (body.agence_id === '' || body.agence_id === null) values.agence_id = null;
    else if (Number.isInteger(Number(body.agence_id)) && Number(body.agence_id) > 0) values.agence_id = Number(body.agence_id);
    else errors.push({ champ: 'agence_id', code: 'invalid_number' });
  }
  return { values, errors };
}

const createNews = async (req, res, next) => {
  try {
    const { values, errors } = parseBody(req.body || {}, false);
    if (errors.length) { cleanup(req); return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: errors }); }
    const data = { categorie: 'NEWS', statut: 'PUBLISHED', ...values, auteur_id: req.utilisateur.id };
    if (req.utilisateur.role === 'agence') {
      const ids = await agencyIds(req.utilisateur);
      if (!ids.length) { cleanup(req); return fail(res, 403, 'NO_AGENCY', 'Aucune agence associée'); }
      if (values.agence_id != null && !ids.map(Number).includes(Number(values.agence_id))) { cleanup(req); return fail(res, 403, 'AGENCY_FORBIDDEN', 'Agence non autorisée'); }
      data.agence_id = values.agence_id ?? ids[0];
    } else if (values.agence_id != null) {
      const [rows] = await pool.execute('SELECT id FROM agences WHERE id=?', [values.agence_id]);
      if (!rows.length) { cleanup(req); return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: [{ champ: 'agence_id', code: 'invalid_reference' }] }); }
    }
    if (req.file) { data.media_path = req.file.filename; data.media_type = VIDEO_TYPES.has(req.file.mimetype) ? 'VIDEO' : 'IMAGE'; }
    const names = Object.keys(data);
    const [result] = await pool.execute(`INSERT INTO actualites (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`, names.map((n) => data[n] ?? null));
    await audit(req, 'create', 'actualites', result.insertId, { titre: data.titre });
    realtime.broadcast('news', { action: 'created', id: result.insertId });
    res.status(201).json({ succes: true, item: await fetchOne(result.insertId, req.utilisateur.id) });
  } catch (error) { cleanup(req); next(error); }
};

const updateNews = async (req, res, next) => {
  try {
    const before = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!before || !(await canManage(req.utilisateur, before))) { cleanup(req); return fail(res, 404, 'NOT_FOUND', 'Actualité introuvable'); }
    const { values, errors } = parseBody(req.body || {}, true);
    if (errors.length) { cleanup(req); return fail(res, 400, 'VALIDATION_ERROR', 'Données invalides', { erreurs: errors }); }
    delete values.agence_id; // la portée d'une actualité ne change pas
    const [[old]] = await pool.execute('SELECT media_path FROM actualites WHERE id=?', [before.id]);
    const data = { ...values };
    if (req.file) { data.media_path = req.file.filename; data.media_type = VIDEO_TYPES.has(req.file.mimetype) ? 'VIDEO' : 'IMAGE'; }
    else if (req.body.remove_media === '1') { data.media_path = null; data.media_type = 'NONE'; }
    const names = Object.keys(data);
    if (!names.length) return fail(res, 400, 'VALIDATION_ERROR', 'Aucune modification fournie');
    await pool.execute(`UPDATE actualites SET ${names.map((n) => `${n}=?`).join(',')} WHERE id=?`, [...names.map((n) => data[n] ?? null), before.id]);
    if ('media_path' in data) unlinkMedia(old.media_path);
    await audit(req, 'update', 'actualites', before.id, values);
    realtime.broadcast('news', { action: 'updated', id: before.id });
    res.json({ succes: true, item: await fetchOne(before.id, req.utilisateur.id) });
  } catch (error) { cleanup(req); next(error); }
};

const deleteNews = async (req, res, next) => {
  try {
    const item = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!item || !(await canManage(req.utilisateur, item))) return fail(res, 404, 'NOT_FOUND', 'Actualité introuvable');
    const [[old]] = await pool.execute('SELECT media_path FROM actualites WHERE id=?', [item.id]);
    await pool.execute('DELETE FROM actualites WHERE id=?', [item.id]);
    unlinkMedia(old?.media_path);
    await audit(req, 'delete', 'actualites', item.id);
    realtime.broadcast('news', { action: 'deleted' });
    res.json({ succes: true });
  } catch (error) { next(error); }
};

const like = async (req, res, next) => {
  try {
    const item = await fetchOne(Number(req.params.id), req.utilisateur.id);
    if (!item || !(await canView(req.utilisateur, item))) return fail(res, 404, 'NOT_FOUND', 'Actualité introuvable');
    await pool.execute('INSERT IGNORE INTO actualites_likes (actualite_id, utilisateur_id) VALUES (?,?)', [item.id, req.utilisateur.id]);
    res.status(201).json({ succes: true, item: await fetchOne(item.id, req.utilisateur.id) });
  } catch (error) { next(error); }
};

const unlike = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.execute('DELETE FROM actualites_likes WHERE actualite_id=? AND utilisateur_id=?', [id, req.utilisateur.id]);
    const item = await fetchOne(id, req.utilisateur.id);
    if (!item) return fail(res, 404, 'NOT_FOUND', 'Actualité introuvable');
    res.json({ succes: true, item });
  } catch (error) { next(error); }
};

module.exports = { parseUpload, listNews, createNews, updateNews, deleteNews, like, unlike };
