const express = require('express');
const { body, param, query } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listerPaiements, creerPaiement, mettreAJourStatutPaiement } = require('../controllers/paymentsController');

const router = express.Router();
router.use(authentifier, autoriser('admin', 'agence'));

router.get('/', query('annee').optional().isInt({ min: 2000, max: 2100 }), listerPaiements);
router.post('/', [
  body('dossier_id').isInt({ min: 1 }).withMessage('Dossier requis.'),
  body('forfait_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Forfait invalide.'),
  body('montant').isFloat({ gt: 0 }).withMessage('Le montant doit être supérieur à zéro.'),
  body('moyen_paiement').isIn(['especes', 'virement', 'mobile_money', 'cheque', 'autre']).withMessage('Moyen de paiement invalide.'),
  body('reference').optional({ values: 'null' }).trim().isLength({ max: 120 }),
  body('commentaire').optional({ values: 'null' }).trim().isLength({ max: 2000 }),
], creerPaiement);
router.patch('/:id/statut', [
  param('id').isInt({ min: 1 }),
  body('statut').isIn(['valide', 'rejete']).withMessage('Statut de traitement invalide.'),
], mettreAJourStatutPaiement);

module.exports = router;