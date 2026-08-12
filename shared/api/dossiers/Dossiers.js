/**
 * Routes des dossiers pèlerins
 * Base : /api/dossiers
 */

const router = require('express').Router();
const { body } = require('express-validator');
const {
  listerDossiers, obtenirDossier, creerDossier, mettreAJourStatut,
} = require('../controllers/dossiersController');
const { authentifier, autoriser } = require('../middleware/auth');

// Toutes les routes dossiers nécessitent une authentification
router.use(authentifier);

const reglesDossier = [
  body('annee_hajj').isInt({ min: 2024 }).withMessage('Année Hajj invalide'),
  body('type_package').optional().isIn(['economique','standard','premium']),
];

const reglesStatut = [
  body('statut').isIn(['en_attente','en_cours','valide','rejete','annule'])
    .withMessage('Statut invalide'),
];

router.get('/',          listerDossiers);
router.get('/:id',       obtenirDossier);
router.post('/',         autoriser('pelerin', 'agence'), reglesDossier, creerDossier);
router.patch('/:id/statut', autoriser('admin', 'agence'), reglesStatut, mettreAJourStatut);

module.exports = router;