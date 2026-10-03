const express = require('express');
const { body, param, query } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/Auth');
const { listerDocumentsPourRevue, marquerEnRevue, validerDocument, rejeterDocument } = require('../controllers/documentsController');
const router = express.Router();
router.use(authentifier, autoriser('admin', 'agence'));
router.get('/', query('statut').optional().isIn(['ALL','PENDING','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED']), listerDocumentsPourRevue);
router.patch('/:id/review', [
	param('id').isInt({ min: 1 }),
	body('statut').isIn(['UNDER_REVIEW','APPROVED','REJECTED']),
	body('motif').if(body('statut').equals('REJECTED')).trim().notEmpty().isLength({ max: 1000 }),
], marquerEnRevue);
router.patch('/:id/validate', param('id').isInt(), validerDocument);
router.patch('/:id/reject', param('id').isInt(), body('motif').trim().notEmpty().isLength({ max: 1000 }), rejeterDocument);
module.exports = router;
