const express = require('express');
const { body, query } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listerAgences, creerAgence, modifierOrganisation, listerEncadreurs, creerEncadreur, obtenirStatistiques, obtenirDashboard, supprimerEncadreur, supprimerAgence } = require('../controllers/adminController');

const router = express.Router();
router.use(authentifier, autoriser('admin'));

const accountRules = [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum'),
];

router.get('/agencies', listerAgences);
router.get('/stats', obtenirStatistiques);
router.get('/dashboard', query('annee').optional().isInt({ min: 2000, max: 2100 }), obtenirDashboard);
router.post('/agencies', accountRules.concat(body('nom_agence').trim().notEmpty().withMessage('Nom agence requis')), creerAgence);
router.patch('/agencies/:id/organisation', [
  body('name').optional().trim().notEmpty(),
  body('legal_name').optional({ values: 'null' }).trim().isLength({ max: 200 }),
  body('registration_number').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('country').optional().trim().notEmpty().isLength({ max: 100 }),
  body('city').optional({ values: 'null' }).trim().isLength({ max: 100 }),
  body('address').optional({ values: 'null' }).trim().isLength({ max: 2000 }),
  body('phone').optional({ values: 'null' }).trim().isLength({ max: 30 }),
  body('email').optional({ values: 'null' }).isEmail().normalizeEmail(),
  body('logo').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  body('status').optional().isIn(['ACTIVE','SUSPENDED','PENDING','ARCHIVED']),
  body('subscription_plan').optional().trim().isLength({ min: 2, max: 50 }),
  body('subscription_status').optional().isIn(['ACTIVE','TRIAL','PAST_DUE','CANCELLED']),
], modifierOrganisation);
router.delete('/agencies/:id', supprimerAgence);
router.get('/encadreurs', listerEncadreurs);
router.post('/encadreurs', accountRules.concat(body('agence_id').isInt({ min: 1 }).withMessage('Agence requise')), creerEncadreur);
router.delete('/encadreurs/:id', supprimerEncadreur);

module.exports = router;
