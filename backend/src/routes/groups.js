const express = require('express');
const { body, param, query } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listerGroupes, listerGuides, listerPelerins, obtenirGroupe, creerGroupe, modifierGroupe, ajouterMembre, retirerMembre, deplacerMembre, listerMessages, envoyerMessage } = require('../controllers/groupsController');

const router = express.Router();
router.use(authentifier);
router.get('/', listerGroupes);
router.get('/guides', autoriser('admin', 'agence'), listerGuides);
router.get('/pelerins', autoriser('admin', 'agence'), query('annee_hajj').isInt({ min: 2025, max: 2100 }), listerPelerins);
router.post('/', autoriser('admin', 'agence'), [
  body('nom').trim().notEmpty(),
  body('annee_hajj').isInt({ min: 2025, max: 2100 }),
  body('encadreur_id').optional({ values: 'null' }).isInt({ min: 1 }),
  body('agence_id').optional().isInt({ min: 1 }),
], creerGroupe);
router.patch('/:id', autoriser('admin', 'agence'), [
  param('id').isInt({ min: 1 }),
  body('nom').optional().trim().notEmpty().isLength({ max: 150 }),
  body('annee_hajj').optional().isInt({ min: 2025, max: 2100 }),
  body('agence_id').optional().isInt({ min: 1 }),
  body('encadreur_id').optional({ values: 'null' }).isInt({ min: 1 }),
], modifierGroupe);
router.post('/:id/members', autoriser('admin', 'agence', 'encadreur'), [param('id').isInt(), body('pelerin_id').isInt({ min: 1 })], ajouterMembre);
router.delete('/:id/members/:pelerinId', autoriser('admin', 'agence', 'encadreur'), [param('id').isInt(), param('pelerinId').isInt({ min: 1 })], retirerMembre);
router.post('/:id/members/:pelerinId/move', autoriser('admin', 'agence', 'encadreur'), [param('id').isInt(), param('pelerinId').isInt({ min: 1 }), body('source_groupe_id').isInt({ min: 1 })], deplacerMembre);
router.get('/:id', param('id').isInt(), obtenirGroupe);
router.get('/:id/messages', param('id').isInt(), listerMessages);
router.post('/:id/messages', param('id').isInt(), envoyerMessage);

module.exports = router;
