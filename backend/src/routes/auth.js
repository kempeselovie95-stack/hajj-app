const express = require('express');
const { body } = require('express-validator');
const { seConnecter, sInscrire, obtenirProfil, mettreAJourFcmToken, mettreAJourProfil } = require('../controllers/Authcontroller');
const { authentifier } = require('../middleware/Auth');
const { authConfig, forgotPassword, resetPassword, googleLogin } = require('../controllers/accountRecoveryController');

const router = express.Router();
const connexionRules = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('mot_de_passe').notEmpty().withMessage('Mot de passe requis'),
];
const inscriptionRules = [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('mot_de_passe').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum')
    .matches(/[A-Z]/).withMessage('Mot de passe : au moins une majuscule')
    .matches(/[0-9]/).withMessage('Mot de passe : au moins un chiffre'),
  body('telephone').optional({ values: 'falsy' }).matches(/^(?:\+237)?6\d{8}$/).withMessage('Téléphone camerounais invalide'),
];

router.get('/config', authConfig);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleLogin);
router.post('/login', connexionRules, seConnecter);
router.post('/register', inscriptionRules, sInscrire);
router.get('/me', authentifier, obtenirProfil);
router.patch('/profile', authentifier, [
  body('theme').optional().isIn(['system', 'light', 'dark']),
  body('nom').optional().trim().notEmpty().isLength({ max: 100 }), body('prenom').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(), body('telephone').optional({ values: 'falsy' }).isString().isLength({ max: 20 }),
  body('mot_de_passe').optional({ values: 'falsy' }).isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
], mettreAJourProfil);
router.patch('/fcm-token', authentifier, body('fcm_token').optional().isString(), mettreAJourFcmToken);
module.exports = router;
