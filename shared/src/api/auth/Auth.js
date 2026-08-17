/**
 * Routes d'authentification
 * Base : /api/auth
 */

const router = require('express').Router();
const { body } = require('express-validator');
const { seConnecter, sInscrire, obtenirProfil, mettreAJourFcmToken } = require('../controllers/authController');
const { authentifier } = require('../middleware/auth');

// ── Règles de validation ──────────────────────────────────────────────────────
const reglesConnexion = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('mot_de_passe').notEmpty().withMessage('Mot de passe requis'),
];

const reglesInscription = [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('mot_de_passe')
    .isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum')
    .matches(/[A-Z]/).withMessage('Mot de passe : au moins une majuscule')
    .matches(/[0-9]/).withMessage('Mot de passe : au moins un chiffre'),
];

// ── Routes publiques ──────────────────────────────────────────────────────────
router.post('/connexion',   reglesConnexion,    seConnecter);
router.post('/inscription', reglesInscription,  sInscrire);

// ── Routes protégées ──────────────────────────────────────────────────────────
router.get('/profil',         authentifier, obtenirProfil);
router.patch('/fcm-token',    authentifier, mettreAJourFcmToken);

module.exports = router;