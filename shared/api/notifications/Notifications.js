/**
 * Routes des notifications
 * Base : /api/notifications
 */

const router = require('express').Router();
const { authentifier } = require('../middleware/auth');
const { pool } = require('../config/database');

router.use(authentifier);

// ── Lister les notifications de l'utilisateur connecté ───────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { lues, limite = 20 } = req.query;

    let whereClause = 'WHERE destinataire_id = ?';
    const params = [req.utilisateur.id];

    if (lues === 'false') {
      whereClause += ' AND est_lue = FALSE';
    }

    const [notifications] = await pool.execute(
      `SELECT * FROM notifications ${whereClause} ORDER BY cree_le DESC LIMIT ?`,
      [...params, parseInt(limite)]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM notifications WHERE destinataire_id = ? AND est_lue = FALSE',
      [req.utilisateur.id]
    );

    res.json({
      succes: true,
      notifications,
      non_lues: countResult[0].total,
    });
  } catch (error) {
    next(error);
  }
});

// ── Marquer une notification comme lue ───────────────────────────────────────
router.patch('/:id/lire', async (req, res, next) => {
  try {
    await pool.execute(
      'UPDATE notifications SET est_lue = TRUE, lue_le = NOW() WHERE id = ? AND destinataire_id = ?',
      [req.params.id, req.utilisateur.id]
    );
    res.json({ succes: true, message: 'Notification marquée comme lue' });
  } catch (error) {
    next(error);
  }
});

// ── Tout marquer comme lu ─────────────────────────────────────────────────────
router.patch('/tout-lire', async (req, res, next) => {
  try {
    await pool.execute(
      'UPDATE notifications SET est_lue = TRUE, lue_le = NOW() WHERE destinataire_id = ? AND est_lue = FALSE',
      [req.utilisateur.id]
    );
    res.json({ succes: true, message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;