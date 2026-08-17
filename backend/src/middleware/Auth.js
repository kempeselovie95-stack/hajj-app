/**
 * Middleware d'authentification JWT
 * Protège les routes et vérifie les rôles
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// ── Vérifie la présence et la validité du token JWT ───────────────────────────
const authentifier = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        succes: false,
        message: 'Token d\'authentification manquant',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-me');
    if (!secret) return res.status(500).json({ succes: false, message: 'JWT_SECRET non configuré' });
    const decoded = jwt.verify(token, secret);

    // Vérifier que l'utilisateur existe encore en base
    const [rows] = await pool.execute(
      'SELECT id, nom, prenom, email, role, est_actif FROM utilisateurs WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length || !rows[0].est_actif) {
      return res.status(401).json({
        succes: false,
        message: 'Compte introuvable ou désactivé',
      });
    }

    // Attacher l'utilisateur à la requête pour les controllers
    req.utilisateur = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ succes: false, message: 'Session expirée, veuillez vous reconnecter' });
    }
    return res.status(401).json({ succes: false, message: 'Token invalide' });
  }
};

// ── Vérifie que l'utilisateur a un rôle autorisé ─────────────────────────────
const autoriser = (...rolesAutorises) => {
  return (req, res, next) => {
    if (!rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({
        succes: false,
        message: 'Accès refusé — permissions insuffisantes',
      });
    }
    next();
  };
};

module.exports = { authentifier, autoriser };