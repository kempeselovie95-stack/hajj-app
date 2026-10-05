const express = require('express');
const { authentifier, autoriser } = require('../middleware/Auth');
const n = require('../controllers/newsController');

const router = express.Router();
router.use(authentifier);
const idParam = (req, res, next) => (Number.isInteger(Number(req.params.id)) && Number(req.params.id) > 0 ? next()
  : res.status(400).json({ succes: false, code: 'VALIDATION_ERROR', message: 'Identifiant invalide' }));
const publishers = autoriser('admin', 'agence');

router.get('/', n.listNews);
router.post('/', publishers, n.parseUpload, n.createNews);
router.patch('/:id', publishers, idParam, n.parseUpload, n.updateNews);
router.delete('/:id', publishers, idParam, n.deleteNews);
router.post('/:id/like', idParam, n.like);
router.delete('/:id/like', idParam, n.unlike);

module.exports = router;
