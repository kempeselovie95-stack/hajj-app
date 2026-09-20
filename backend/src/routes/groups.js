const express = require('express');
const { body, param } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listerGroupes, obtenirGroupe, creerGroupe, ajouterMembre, listerMessages, envoyerMessage } = require('../controllers/groupsController');

const router = express.Router();
router.use(authentifier);
router.get('/', listerGroupes);
router.get('/:id', param('id').isInt(), obtenirGroupe);
router.post('/', autoriser('admin', 'agence'), [
  body('nom').trim().notEmpty(),
  body('annee_hajj').isInt({ min: 2025, max: 2100 }),
  body('encadreur_id').isInt({ min: 1 }),
  body('agence_id').optional().isInt({ min: 1 }),
], creerGroupe);
router.post('/:id/members', autoriser('admin', 'agence', 'encadreur'), [param('id').isInt(), body('pelerin_id').isInt({ min: 1 })], ajouterMembre);
router.get('/:id/messages', param('id').isInt(), listerMessages);
router.post('/:id/messages', param('id').isInt(), envoyerMessage);

module.exports = router;
