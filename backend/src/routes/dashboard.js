const express = require('express');
const { authentifier, autoriser } = require('../middleware/Auth');
const { getSidebarBadges } = require('../controllers/dashboardController');
const { getOverview } = require('../controllers/overviewController');

const router = express.Router();
router.use(authentifier);
router.get('/badges', getSidebarBadges);
router.get('/overview', autoriser('admin', 'agence'), getOverview);

module.exports = router;
