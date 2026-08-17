const express = require('express');
const { pool } = require('../config/database');
const { authentifier } = require('../middleware/auth');
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
module.exports=router;
