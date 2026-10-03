const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { envoyerNotification } = require('../services/notificationService');
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
    const [dossiers] = await pool.execute('SELECT d.*,a.utilisateur_id AS agence_user_id FROM dossiers d LEFT JOIN agences a ON a.id=d.agence_id WHERE d.id=?', [req.params.id]);
    if (!dossiers.length || !ownsDossier(req.utilisateur, dossiers[0])) return res.status(403).json({ succes: false, message: 'Accès refusé.' });
    const [rows] = await pool.execute(`SELECT doc.id, doc.type_document AS type, doc.nom_fichier, doc.chemin_fichier, doc.taille_octets, doc.est_valide, doc.statut, doc.motif_rejet, doc.expiration_date, doc.valide_par, doc.valide_le, doc.cree_le
      FROM documents doc WHERE doc.dossier_id = ? ORDER BY doc.cree_le ASC`, [req.params.id]);
    const documents = rows.map((doc) => {
      const status = doc.expiration_date && new Date(doc.expiration_date) < new Date() && doc.statut === 'APPROVED' ? 'EXPIRED' : doc.statut;
      return {
        ...doc,
        url_fichier: `/uploads/${encodeURIComponent(path.basename(doc.chemin_fichier))}`,
        status,
        motif_rejet: doc.motif_rejet,
        statut: status === 'APPROVED' ? 'valide' : status === 'REJECTED' ? 'rejete' : 'en_attente',
      };
    });
    res.json({ succes: true, documents });
  } catch (e) { next(e); }
};

const listerDocumentsPourRevue = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const status = req.query.statut;
    const params = [];
    let filters = '';
    if (status === 'EXPIRED') filters += " AND doc.statut='APPROVED' AND doc.expiration_date<CURRENT_DATE";
    else if (status && status !== 'ALL') { filters += ' AND doc.statut=?'; params.push(status); }
    if (req.utilisateur.role === 'agence') {
      filters += ' AND d.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)';
      params.push(req.utilisateur.id);
    }
    const [rows] = await pool.execute(
      `SELECT doc.id,doc.type_document AS type,doc.nom_fichier,doc.chemin_fichier,doc.taille_octets,
        doc.statut,doc.motif_rejet AS rejection_reason,doc.expiration_date,doc.valide_par AS reviewed_by,
        doc.valide_le AS reviewed_at,doc.cree_le AS uploaded_at,d.id AS dossier_id,d.numero_dossier,
        d.annee_hajj,CONCAT(p.prenom,' ',p.nom) AS pelerin_nom,p.email AS pelerin_email,
        a.nom_agence AS organisation
       FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id
       JOIN utilisateurs p ON p.id=d.pelerin_id LEFT JOIN agences a ON a.id=d.agence_id
       WHERE 1=1 ${filters} ORDER BY FIELD(doc.statut,'PENDING','UNDER_REVIEW','REJECTED','EXPIRED','APPROVED'),doc.cree_le DESC LIMIT 300`,
      params
    );
    const documents = rows.map((doc) => ({
      ...doc,
      file_url: `/uploads/${encodeURIComponent(path.basename(doc.chemin_fichier))}`,
      statut: doc.expiration_date && new Date(doc.expiration_date) < new Date() && doc.statut === 'APPROVED' ? 'EXPIRED' : doc.statut,
    }));
    res.json({ succes: true, documents });
  } catch (error) { next(error); }
};

const uploadDocument = (req, res, next) => upload(req, res, async (err) => {
  if (err) return res.status(400).json({ succes: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux.' : 'Fichier invalide.' });
  try {
    const dossierId = req.params.id;
    const type = req.body.type_document;
    const expirationDate = req.body.expiration_date || null;
    const [rows] = await pool.execute(`SELECT d.*, a.utilisateur_id AS agence_user_id FROM dossiers d LEFT JOIN agences a ON a.id=d.agence_id WHERE d.id=?`, [dossierId]);
    if (!rows.length || !ownsDossier(req.utilisateur, rows[0])) return res.status(403).json({ succes:false, message:'Accès refusé.' });
    if (!type) return res.status(400).json({ succes:false, message:'Type de document requis.' });
    if (!req.file) return res.status(400).json({ succes:false, message:'Fichier requis.' });
    if (expirationDate && (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate) || Number.isNaN(Date.parse(`${expirationDate}T00:00:00Z`)))) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ succes: false, message: 'Date d’expiration invalide. Format attendu : AAAA-MM-JJ.' });
    }
    const [existing] = await pool.execute('SELECT id, chemin_fichier FROM documents WHERE dossier_id=? AND type_document=? LIMIT 1', [dossierId, type]);
    if (existing.length) {
      await pool.execute('UPDATE documents SET nom_fichier=?, chemin_fichier=?, taille_octets=?, est_valide=NULL, statut=\'PENDING\', motif_rejet=NULL, expiration_date=?, valide_par=NULL, valide_le=NULL WHERE id=?', [req.file.originalname, req.file.path, req.file.size, expirationDate, existing[0].id]);
      if (existing[0].chemin_fichier && existing[0].chemin_fichier !== req.file.path) fs.unlink(existing[0].chemin_fichier, () => {});
    } else {
      await pool.execute('INSERT INTO documents (dossier_id,type_document,nom_fichier,chemin_fichier,taille_octets,est_valide,statut,expiration_date) VALUES (?,?,?,?,?,NULL,\'PENDING\',?)', [dossierId,type,req.file.originalname,req.file.path,req.file.size,expirationDate]);
    }
    res.status(201).json({ succes:true, message:'Document envoyé.', document:{ type, nom_fichier:req.file.originalname, statut:'en_attente' } });
  } catch (e) { if(req.file) fs.unlink(req.file.path,()=>{}); next(e); }
});

async function updateDocument(req,res,next,status) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const [rows] = await pool.execute(`SELECT doc.*,d.pelerin_id,d.numero_dossier,a.utilisateur_id AS agence_user_id,u.fcm_token,CONCAT(u.prenom,' ',u.nom) AS pelerin_nom FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id JOIN utilisateurs u ON u.id=d.pelerin_id LEFT JOIN agences a ON a.id=d.agence_id WHERE doc.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({succes:false,message:'Document introuvable.'});
    if (req.utilisateur.role === 'agence' && Number(rows[0].agence_user_id) !== Number(req.utilisateur.id)) return res.status(403).json({succes:false,message:'Accès refusé.'});
    const document = rows[0];
    if (!['PENDING','UNDER_REVIEW'].includes(document.statut)) return res.status(409).json({ succes: false, message: 'Ce document a déjà été traité. Une nouvelle version doit être téléversée pour le réexaminer.' });
    const reason = status === 'REJECTED' ? String(req.body.motif || '').trim() : null;
    if (status === 'REJECTED' && !reason) return res.status(400).json({ succes: false, message: 'Le motif du rejet est requis.' });
    if (status === 'UNDER_REVIEW') {
      await pool.execute('UPDATE documents SET statut=?,est_valide=NULL,motif_rejet=NULL WHERE id=?', [status, req.params.id]);
      return res.json({ succes: true, message: 'Document marqué en cours de revue.' });
    }
    const valid = status === 'APPROVED';
    const notificationType = valid ? 'document_valide' : 'document_rejete';
    const notificationTitle = valid ? 'Document validé' : 'Nouvelle version requise';
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
          "UPDATE documents SET statut=?,motif_rejet=?,est_valide=?,valide_par=?,valide_le=NOW() WHERE id=? AND statut IN ('PENDING','UNDER_REVIEW')",
          [status, reason, valid ? 1 : 0, req.utilisateur.id, req.params.id]
        );
        if (!result.affectedRows) {
          await connection.rollback();
          return res.status(409).json({ succes: false, message: 'Ce document a déjà été traité.' });
        }
        await connection.execute('INSERT INTO notifications (destinataire_id,titre,corps,type) VALUES (?,?,?,?)', [document.pelerin_id, notificationTitle, notificationBody, notificationType]);
        await connection.commit();
      } catch (transactionError) {
        await connection.rollback();
        throw transactionError;
      } finally { connection.release(); }
    if (document.fcm_token) await envoyerNotification(document.fcm_token, notificationTitle, notificationBody);
    res.json({ succes: true, message: valid ? 'Document validé.' : 'Nouvelle version demandée.' });
  } catch(e){ next(e); }
}
const validerDocument=(req,res,next)=>updateDocument(req,res,next,'APPROVED');
const rejeterDocument=(req,res,next)=>updateDocument(req,res,next,'REJECTED');
const marquerEnRevue=(req,res,next)=>updateDocument(req,res,next,'UNDER_REVIEW');
module.exports={uploadDocument,listerDocuments,listerDocumentsPourRevue,validerDocument,rejeterDocument,marquerEnRevue};
