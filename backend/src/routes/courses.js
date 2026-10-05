const express = require('express');
const { authentifier, autoriser } = require('../middleware/Auth');
const c = require('../controllers/coursesController');

const router = express.Router();
const idParam = (req, res, next) => (Number.isInteger(Number(req.params.id)) && Number(req.params.id) > 0 ? next()
  : res.status(400).json({ succes: false, code: 'VALIDATION_ERROR', message: 'Identifiant invalide' }));

// Téléchargement : protégé par un lien signé éphémère (voir /:id/download-link), donc avant l'authentification par en-tête.
router.get('/:id/download', idParam, c.downloadFile);

router.use(authentifier);
const authors = autoriser('encadreur', 'agence', 'admin');

router.get('/', c.listCourses);
router.post('/', authors, c.parseUploads, c.createCourse);
router.patch('/:id', authors, idParam, c.parseUploads, c.updateCourse);
router.delete('/:id', authors, idParam, c.deleteCourse);
router.get('/:id', idParam, c.getCourse);
router.get('/:id/participants', authors, idParam, c.listParticipants);
router.get('/:id/download-link', idParam, c.downloadLink);
router.post('/:id/favorite', idParam, c.favorite);
router.delete('/:id/favorite', idParam, c.unfavorite);
router.post('/:id/enroll', autoriser('pelerin'), idParam, c.enroll);
router.delete('/:id/enroll', autoriser('pelerin'), idParam, c.unenroll);

module.exports = router;
