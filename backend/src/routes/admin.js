const express = require('express');
const { body } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listerAgences, creerAgence, listerEncadreurs, creerEncadreur, obtenirStatistiques, supprimerEncadreur, supprimerAgence } = require('../controllers/adminController');

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
router.post('/agencies', accountRules.concat(body('nom_agence').trim().notEmpty().withMessage('Nom agence requis')), creerAgence);
router.delete('/agencies/:id', supprimerAgence);
router.get('/encadreurs', listerEncadreurs);
router.post('/encadreurs', accountRules.concat(body('agence_id').isInt({ min: 1 }).withMessage('Agence requise')), creerEncadreur);
router.delete('/encadreurs/:id', supprimerEncadreur);

module.exports = router;
