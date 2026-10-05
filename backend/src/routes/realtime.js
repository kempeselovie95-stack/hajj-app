const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { canAccessGroup } = require('../controllers/groupsController');
const realtime = require('../services/realtime');

const router = express.Router();

// EventSource ne sait pas envoyer d'en-tête Authorization : le jeton passe en paramètre d'URL.
router.get('/', async (req, res) => {
  try {
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-me');
    const decoded = jwt.verify(String(req.query.token || ''), secret);
    const [rows] = await pool.execute('SELECT id, role, est_actif FROM utilisateurs WHERE id=?', [decoded.id]);
    if (!rows.length || !rows[0].est_actif) return res.status(401).end();
    const user = rows[0];
    const wanted = String(req.query.groups || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 30);
    const groups = [];
    for (const groupId of wanted) { if ((await canAccessGroup(user, groupId)).allowed) groups.push(groupId); }

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write(`retry: 3000\nevent: ready\ndata: ${JSON.stringify({ groups })}\n\n`);
    const connection = realtime.register(res, { userId: user.id, groups });
    req.on('close', () => realtime.unregister(connection));
  } catch { res.status(401).end(); }
});

module.exports = router;
