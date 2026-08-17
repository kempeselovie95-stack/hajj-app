const express = require('express');
const { body, param } = require('express-validator');
const { authentifier, autoriser } = require('../middleware/auth');
const { validerDocument, rejeterDocument } = require('../controllers/documentsController');
const router = express.Router();
router.use(authentifier, autoriser('admin', 'agence'));
router.patch('/:id/validate', param('id').isInt(), validerDocument);
router.patch('/:id/reject', param('id').isInt(), body('motif').trim().notEmpty().isLength({ max: 1000 }), rejeterDocument);
module.exports = router;
