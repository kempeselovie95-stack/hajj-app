const express = require('express');
const { body, param } = require('express-validator');
const { listerDossiers, obtenirDossier, creerDossier, mettreAJourStatut } = require('../controllers/dossiersController');
const { authentifier, autoriser } = require('../middleware/auth');
const { uploadDocument, listerDocuments } = require('../controllers/documentsController');

const router = express.Router();
router.use(authentifier);
const dossierRules = [
  body('annee_hajj').isInt({ min: 2025, max: 2100 }).withMessage('Année Hajj invalide'),
  body('type_package').optional().isIn(['economique','standard','premium']).withMessage('Package invalide'),
  body('agence_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Agence invalide'),
];
const statusRules = [
  body('statut').isIn(['brouillon','soumis','en_verification','valide','transmis_nusuk','confirme','rejete','annule']).withMessage('Statut invalide'),
  body('commentaire').optional().isString().trim().isLength({ max: 2000 }),
];

router.get('/', listerDossiers);
router.get('/:id', param('id').isInt(), obtenirDossier);
router.get('/:id/documents', param('id').isInt(), listerDocuments);
router.post('/', autoriser('pelerin'), dossierRules, creerDossier);
router.patch('/:id/statut', autoriser('admin', 'agence'), param('id').isInt(), statusRules, mettreAJourStatut);
router.post('/:id/documents', autoriser('pelerin'), param('id').isInt(), uploadDocument);
module.exports = router;
