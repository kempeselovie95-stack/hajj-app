const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const DOCUMENT_UPLOAD_CONSTRAINTS = { ACCEPTED_MIME_TYPES: ['image/jpeg','image/png','application/pdf'], MAX_SIZE_BYTES: 5 * 1024 * 1024 };

const uploadDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,10)}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: DOCUMENT_UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => cb(null, DOCUMENT_UPLOAD_CONSTRAINTS.ACCEPTED_MIME_TYPES.includes(file.mimetype)),
}).single('fichier');

function ownsDossier(user, dossier) {
  return user.role === 'admin' || (user.role === 'pelerin' && dossier.pelerin_id === user.id) || (user.role === 'agence' && dossier.agence_user_id === user.id);
}

const listerDocuments = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`SELECT doc.id, doc.type_document AS type, doc.nom_fichier, CONCAT('/uploads/', SUBSTRING_INDEX(doc.chemin_fichier, '/', -1)) AS url_fichier, doc.taille_octets, doc.est_valide, doc.valide_le, doc.cree_le
      FROM documents doc WHERE doc.dossier_id = ? ORDER BY doc.cree_le ASC`, [req.params.id]);
    const documents = rows.map((doc) => ({ ...doc, statut: doc.est_valide === true || doc.est_valide === 1 ? 'valide' : doc.est_valide === false || doc.est_valide === 0 ? 'rejete' : 'en_attente' }));
    res.json({ succes: true, documents });
  } catch (e) { next(e); }
};

const uploadDocument = (req, res, next) => upload(req, res, async (err) => {
  if (err) return res.status(400).json({ succes: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux.' : 'Fichier invalide.' });
  try {
    const dossierId = req.params.id;
    const type = req.body.type_document;
    const [rows] = await pool.execute(`SELECT d.*, a.utilisateur_id AS agence_user_id FROM dossiers d LEFT JOIN agences a ON a.id=d.agence_id WHERE d.id=?`, [dossierId]);
    if (!rows.length || !ownsDossier(req.utilisateur, rows[0])) return res.status(403).json({ succes:false, message:'Accès refusé.' });
    if (!type) return res.status(400).json({ succes:false, message:'Type de document requis.' });
    if (!req.file) return res.status(400).json({ succes:false, message:'Fichier requis.' });
    const [existing] = await pool.execute('SELECT id, chemin_fichier FROM documents WHERE dossier_id=? AND type_document=? LIMIT 1', [dossierId, type]);
    if (existing.length) {
      await pool.execute('UPDATE documents SET nom_fichier=?, chemin_fichier=?, taille_octets=?, est_valide=NULL, valide_par=NULL, valide_le=NULL WHERE id=?', [req.file.originalname, req.file.path, req.file.size, existing[0].id]);
      if (existing[0].chemin_fichier && existing[0].chemin_fichier !== req.file.path) fs.unlink(existing[0].chemin_fichier, () => {});
    } else {
      await pool.execute('INSERT INTO documents (dossier_id, type_document, nom_fichier, chemin_fichier, taille_octets, est_valide) VALUES (?,?,?,?,?,NULL)', [dossierId,type,req.file.originalname,req.file.path,req.file.size]);
    }
    res.status(201).json({ succes:true, message:'Document envoyé.', document:{ type, nom_fichier:req.file.originalname, statut:'en_attente' } });
  } catch (e) { if(req.file) fs.unlink(req.file.path,()=>{}); next(e); }
});

async function updateDocument(req,res,next,valid) {
  try {
    const [rows] = await pool.execute(`SELECT doc.*, d.pelerin_id, a.utilisateur_id AS agence_user_id FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id LEFT JOIN agences a ON a.id=d.agence_id WHERE doc.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({succes:false,message:'Document introuvable.'});
    if (req.utilisateur.role === 'agence' && rows[0].agence_user_id !== req.utilisateur.id) return res.status(403).json({succes:false,message:'Accès refusé.'});
    await pool.execute('UPDATE documents SET est_valide=?, valide_par=?, valide_le=IF(?, NOW(), NULL) WHERE id=?', [valid, req.utilisateur.id, valid ? 1 : 0, req.params.id]);
    res.json({succes:true,message:valid?'Document validé.':'Document rejeté.'});
  } catch(e){ next(e); }
}
const validerDocument=(req,res,next)=>updateDocument(req,res,next,true);
const rejeterDocument=(req,res,next)=>updateDocument(req,res,next,false);
module.exports={uploadDocument,listerDocuments,validerDocument,rejeterDocument};
