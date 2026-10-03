const express = require('express');
const { body } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listSaisons, createSaison, listForfaits, createForfait, getDashboard } = require('../controllers/catalogController');

const router = express.Router();
router.use(authentifier);

const saisonRules = [
  body('libelle').trim().notEmpty().withMessage('Libellé requis'),
  body('annee').isInt({ min: 2025, max: 2100 }).withMessage('Année Hajj invalide'),
  body('date_debut').optional({ values: 'null' }).isISO8601().withMessage('Date de début invalide'),
  body('date_fin').optional({ values: 'null' }).isISO8601().withMessage('Date de fin invalide'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('est_active').optional().isBoolean().withMessage('est_active doit être un booléen'),
];

const forfaitRules = [
  body('saison_id').isInt({ min: 1 }).withMessage('Saison requise'),
  body('nom').trim().notEmpty().withMessage('Nom du forfait requis'),
  body('prix').isFloat({ min: 0 }).withMessage('Prix invalide'),
  body('devise').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Devise invalide'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('inclus').optional().trim().isLength({ max: 2000 }),
  body('est_actif').optional().isBoolean(),
];

router.get('/dashboard', autoriser('admin', 'agence'), getDashboard);
router.get('/saisons', autoriser('admin', 'agence'), listSaisons);
router.post('/saisons', autoriser('admin', 'agence'), saisonRules, createSaison);
router.get('/forfaits', autoriser('admin', 'agence'), listForfaits);
router.post('/forfaits', autoriser('admin', 'agence'), forfaitRules, createForfait);

module.exports = router;
