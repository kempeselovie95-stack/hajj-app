const express = require('express');
const { authentifier, autoriser } = require('../middleware/Auth');
const ops = require('../controllers/operationsController');

const router = express.Router();
router.use(authentifier);

const staff = autoriser('admin', 'agence', 'encadreur');
const managers = autoriser('admin', 'agence');
const idParam = (req, res, next) => (Number.isInteger(Number(req.params.id)) && Number(req.params.id) > 0 ? next()
  : res.status(400).json({ succes: false, code: 'VALIDATION_ERROR', message: 'Identifiant invalide' }));

// Espace pèlerin
router.get('/me/trip', autoriser('pelerin'), ops.getMyTrip);
router.get('/qr/me', autoriser('pelerin'), ops.getMyQr);

// QR Code, présence, incidents
router.get('/qr/pilgrim/:pelerinId', managers, ops.getPilgrimQr);
router.post('/qr/scan', staff, ops.scanQr);
router.get('/attendance/groups/:groupId', staff, ops.getAttendance);
router.post('/attendance', staff, ops.recordAttendance);
router.get('/incidents', staff, ops.listIncidents);
router.post('/incidents', staff, ops.createIncident);
router.patch('/incidents/:id', managers, idParam, ops.updateIncident);
router.get('/audit', autoriser('admin'), ops.listAudit);

// Chambres ↔ pèlerins, vols ↔ groupes
router.get('/hotels/:hotelId/rooms', staff, ops.listRoomOccupants);
router.post('/rooms/:id/occupants', managers, idParam, ops.assignOccupant);
router.delete('/rooms/:id/occupants/:pelerinId', managers, idParam, ops.removeOccupant);
router.put('/flights/:id/groups', managers, idParam, ops.setFlightGroups);

// Lieux : lecture ouverte aux pèlerins (carte), écriture réservée aux gestionnaires
router.get('/places/nearby', autoriser('admin', 'agence', 'encadreur', 'pelerin'), require('../controllers/nearbyController').nearby);
router.get('/places', autoriser('admin', 'agence', 'encadreur', 'pelerin'), ops.listResource('places'));

// CRUD générique (périmètre agence appliqué dans le contrôleur)
for (const name of ops.RESOURCE_NAMES) {
  if (name !== 'places') router.get(`/${name}`, staff, ops.listResource(name));
  router.post(`/${name}`, managers, ops.createResource(name));
  router.patch(`/${name}/:id`, managers, idParam, ops.updateResource(name));
  router.delete(`/${name}/:id`, managers, idParam, ops.deleteResource(name));
}

module.exports = router;
