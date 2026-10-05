const express = require('express');
const { authentifier, autoriser } = require('../middleware/Auth');
const { obtenirSynthese, listerForfaits, choisirForfait, declarerPaiement } = require('../controllers/pelerinController');

const router = express.Router();
router.use(authentifier, autoriser('pelerin'));
router.get('/summary', obtenirSynthese);
router.get('/forfaits', listerForfaits);
router.patch('/forfait', choisirForfait);
router.post('/paiements', declarerPaiement);

module.exports = router;
