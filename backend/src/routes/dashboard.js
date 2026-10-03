const express = require('express');
const { authentifier } = require('../middleware/Auth');
const { getSidebarBadges } = require('../controllers/dashboardController');

const router = express.Router();
router.use(authentifier);
router.get('/badges', getSidebarBadges);

module.exports = router;