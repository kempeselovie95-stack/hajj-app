const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { envoyerNotification } = require('../services/notificationService');

const ALLOWED_TRANSITIONS = {
  brouillon: ['soumis', 'annule'],
  soumis: ['en_verification', 'rejete', 'annule'],
  en_verification: ['valide', 'rejete'],
  valide: ['transmis_nusuk', 'annule'],
  transmis_nusuk: ['confirme', 'rejete'],
  confirme: [],
  rejete: ['soumis'],
  annule: [],
};
const STATUS_LABELS = {
  brouillon:'Brouillon', soumis:'Soumis', en_verification:'En vérification', valide:'Validé',
  transmis_nusuk:'Transmis à NUSUK', confirme:'Confirmé', rejete:'Rejeté', annule:'Annulé'
};

async function getDossierAccess(id) {
  const [rows] = await pool.execute(`SELECT d.*, u.fcm_token, a.utilisateur_id AS agence_user_id FROM dossiers d JOIN utilisateurs u ON u.id=d.pelerin_id LEFT JOIN agences a ON a.id=d.agence_id WHERE d.id=?`, [id]);
  return rows[0] || null;
}

async function genererNumeroDossier(annee) {
  const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM dossiers WHERE annee_hajj=?', [annee]);
  return `DOS-${annee}-${String(Number(rows[0].total)+1).padStart(4,'0')}`;
}

const listerDossiers = async (req,res,next)=>{try{
  const {role,id}=req.utilisateur;
  const page=Math.max(Number.parseInt(req.query.page,10)||1,1);
  const limite=Math.min(Math.max(Number.parseInt(req.query.limite,10)||10,1),100);
  const params=[]; let where='';
  if(role==='pelerin'){where='WHERE d.pelerin_id=?';params.push(id);}
  else if(role==='agence'){where='WHERE d.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)';params.push(id);}
  if(req.query.statut){where += where?' AND d.statut=?':'WHERE d.statut=?';params.push(req.query.statut);}
  const offset=(page-1)*limite;
  const [dossiers]=await pool.execute(`SELECT d.id,d.numero_dossier,d.annee_hajj,d.statut,d.type_package,d.date_depart,d.date_retour,d.cree_le,
    CONCAT(u.prenom,' ',u.nom) AS pelerin_nom,u.email AS pelerin_email,a.nom_agence
    FROM dossiers d JOIN utilisateurs u ON u.id=d.pelerin_id LEFT JOIN agences a ON a.id=d.agence_id ${where} ORDER BY d.cree_le DESC LIMIT ${limite} OFFSET ${offset}`,params);
  const [count]=await pool.execute(`SELECT COUNT(*) AS total FROM dossiers d ${where}`,params);
  res.json({succes:true,dossiers,pagination:{page,limite,total:Number(count[0].total),totalPages:Math.ceil(Number(count[0].total)/limite)}});
}catch(e){next(e)}};

const obtenirDossier = async (req,res,next)=>{try{
  const dossier=await getDossierAccess(req.params.id);
  if(!dossier)return res.status(404).json({succes:false,message:'Dossier introuvable'});
  if(req.utilisateur.role==='pelerin'&&dossier.pelerin_id!==req.utilisateur.id)return res.status(403).json({succes:false,message:'Accès refusé'});
  if(req.utilisateur.role==='agence'&&dossier.agence_user_id!==req.utilisateur.id)return res.status(403).json({succes:false,message:'Accès refusé'});
  const [documents]=await pool.execute(`SELECT id,type_document AS type,nom_fichier,chemin_fichier AS url_fichier,taille_octets,est_valide,cree_le FROM documents WHERE dossier_id=? ORDER BY cree_le`,[req.params.id]);
  const [historiqueRows]=await pool.execute(`SELECT h.id,h.statut,h.commentaire,h.cree_le,h.modifie_par,CONCAT(u.prenom,' ',u.nom) AS modifie_par_nom FROM historique_statuts h LEFT JOIN utilisateurs u ON u.id=h.modifie_par WHERE h.dossier_id=? ORDER BY h.cree_le ASC`,[req.params.id]);
  const historique=historiqueRows.map((h,i)=>({id:h.id,ancien_statut:i?historiqueRows[i-1].statut:null,nouveau_statut:h.statut,commentaire:h.commentaire,modifie_par_nom:h.modifie_par_nom||'Système',created_at:h.cree_le}));
  res.json({succes:true,dossier:{...dossier,documents,historique}});
}catch(e){next(e)}};

const creerDossier = async (req,res,next)=>{try{
  const errors=validationResult(req); if(!errors.isEmpty())return res.status(400).json({succes:false,erreurs:errors.array()});
  const {annee_hajj,type_package='standard',agence_id=null}=req.body;
  if(agence_id){const [a]=await pool.execute('SELECT id FROM agences WHERE id=?',[agence_id]);if(!a.length)return res.status(400).json({succes:false,message:'Agence introuvable'});}
  const numero=await genererNumeroDossier(annee_hajj);
  const [result]=await pool.execute(`INSERT INTO dossiers(pelerin_id,agence_id,numero_dossier,annee_hajj,statut,type_package) VALUES(?,?,?,?,?,?)`,[req.utilisateur.id,agence_id,numero,annee_hajj,'brouillon',type_package]);
  await pool.execute(`INSERT INTO historique_statuts(dossier_id,statut,commentaire,modifie_par) VALUES(?,?,?,?)`,[result.insertId,'brouillon','Dossier créé',req.utilisateur.id]);
  res.status(201).json({succes:true,message:'Dossier créé avec succès',dossier_id:result.insertId,numero_dossier:numero});
}catch(e){next(e)}};

const mettreAJourStatut = async (req,res,next)=>{try{
  const errors=validationResult(req); if(!errors.isEmpty())return res.status(400).json({succes:false,erreurs:errors.array()});
  const dossier=await getDossierAccess(req.params.id); if(!dossier)return res.status(404).json({succes:false,message:'Dossier introuvable'});
  if(req.utilisateur.role==='agence'&&dossier.agence_user_id!==req.utilisateur.id)return res.status(403).json({succes:false,message:'Accès refusé'});
  const {statut,commentaire}=req.body;
  if(!ALLOWED_TRANSITIONS[dossier.statut]?.includes(statut))return res.status(409).json({succes:false,message:`Transition ${dossier.statut} → ${statut} non autorisée`});
  await pool.execute('UPDATE dossiers SET statut=? WHERE id=?',[statut,req.params.id]);
  await pool.execute('INSERT INTO historique_statuts(dossier_id,statut,commentaire,modifie_par) VALUES(?,?,?,?)',[req.params.id,statut,commentaire||null,req.utilisateur.id]);
  const message=`Votre dossier ${dossier.numero_dossier} est maintenant : ${STATUS_LABELS[statut]||statut}. ${commentaire||''}`.trim();
  await pool.execute(`INSERT INTO notifications(destinataire_id,titre,corps,type) VALUES(?,?,?,?)`,[dossier.pelerin_id,`Dossier ${dossier.numero_dossier} mis à jour`,message,'statut_dossier']);
  if(dossier.fcm_token) await envoyerNotification(dossier.fcm_token,`Dossier ${dossier.numero_dossier} — Mise à jour`,message);
  res.json({succes:true,message:'Statut mis à jour avec succès'});
}catch(e){next(e)}};

module.exports={listerDossiers,obtenirDossier,creerDossier,mettreAJourStatut};
