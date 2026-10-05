const { pool } = require('../config/database');

/**
 * Journalise une opération sensible (cahier des charges §39).
 * N'interrompt jamais la requête métier : un échec d'audit est seulement loggé.
 */
async function audit(req, action, entite, entiteId, details = null) {
  try {
    await pool.execute(
      'INSERT INTO journal_audit (utilisateur_id, action, entite, entite_id, details, ip) VALUES (?,?,?,?,?,?)',
      [req.utilisateur?.id ?? null, action, entite, entiteId == null ? null : String(entiteId), details ? JSON.stringify(details) : null, req.ip || null]
    );
  } catch (error) {
    console.warn('⚠️ Audit non enregistré :', error.message);
  }
}

module.exports = { audit };
