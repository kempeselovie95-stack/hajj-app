const express = require('express');
const { pool } = require('../config/database');
const { authentifier } = require('../middleware/Auth');
const router = express.Router();
router.use(authentifier);
router.get('/', async (req,res,next)=>{try{
  const limit=Math.min(Math.max(Number.parseInt(req.query.limite,10)||20,1),100);
  const [notifications]=await pool.execute(`SELECT id,titre,corps,type,est_lue,lue_le,cree_le FROM notifications WHERE destinataire_id=? ORDER BY cree_le DESC LIMIT ${limit}`,[req.utilisateur.id]);
  const [count]=await pool.execute('SELECT COUNT(*) AS total FROM notifications WHERE destinataire_id=? AND est_lue=FALSE',[req.utilisateur.id]);
  res.json({succes:true,notifications,non_lues:count[0].total});
}catch(e){next(e)}});
router.patch('/:id/read',async(req,res,next)=>{try{await pool.execute('UPDATE notifications SET est_lue=TRUE,lue_le=NOW() WHERE id=? AND destinataire_id=?',[req.params.id,req.utilisateur.id]);res.json({succes:true})}catch(e){next(e)}});
router.patch('/read-all',async(req,res,next)=>{try{await pool.execute('UPDATE notifications SET est_lue=TRUE,lue_le=NOW() WHERE destinataire_id=? AND est_lue=FALSE',[req.utilisateur.id]);res.json({succes:true})}catch(e){next(e)}});
// Suppression d'une notification : uniquement celles de l'utilisateur connecté.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ succes: false, code: 'VALIDATION_ERROR', message: 'Identifiant invalide' });
    const [result] = await pool.execute('DELETE FROM notifications WHERE id=? AND destinataire_id=?', [id, req.utilisateur.id]);
    if (!result.affectedRows) return res.status(404).json({ succes: false, code: 'NOT_FOUND', message: 'Notification introuvable' });
    res.json({ succes: true });
  } catch (error) { next(error); }
});
module.exports=router;
