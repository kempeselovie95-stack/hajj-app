const { pool } = require('../config/database');

const getSidebarBadges = async (req, res, next) => {
  try {
    const [seasonRows] = await pool.execute(
      'SELECT annee FROM saisons_hajj WHERE est_active=TRUE ORDER BY annee DESC LIMIT 1'
    );
    const seasonYear = Number(seasonRows[0]?.annee || new Date().getFullYear());
    const scope = req.utilisateur.role === 'agence'
      ? 'AND d.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)'
      : '';
    const scopeParams = req.utilisateur.role === 'agence' ? [req.utilisateur.id] : [];

    let pilgrims = 0;
    let documents = 0;
    if (['admin', 'agence'].includes(req.utilisateur.role)) {
      const [[pilgrimCount]] = await pool.execute(
        `SELECT COUNT(DISTINCT d.pelerin_id) AS total FROM dossiers d WHERE d.annee_hajj=? ${scope}`,
        [seasonYear, ...scopeParams]
      );
      const [[documentCount]] = await pool.execute(
        `SELECT COUNT(*) AS total FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id
         WHERE d.annee_hajj=? AND (doc.statut IN ('PENDING','UNDER_REVIEW')
           OR (doc.statut='APPROVED' AND doc.expiration_date<CURRENT_DATE)) ${scope}`,
        [seasonYear, ...scopeParams]
      );
      pilgrims = Number(pilgrimCount.total || 0);
      documents = Number(documentCount.total || 0);
    }

    res.json({ succes: true, badges: { pilgrims, documents }, saison: seasonYear });
  } catch (error) { next(error); }
};

module.exports = { getSidebarBadges };