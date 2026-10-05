/**
 * Tableau de bord opérationnel (admin = toute la plateforme, agence = son périmètre).
 * Toutes les valeurs sont recalculées à chaque appel : le front se contente de les afficher.
 */
const { pool } = require('../config/database');

const getOverview = async (req, res, next) => {
  try {
    let agencyIds = null;
    if (req.utilisateur.role === 'agence') {
      const [rows] = await pool.execute('SELECT id FROM agences WHERE utilisateur_id=?', [req.utilisateur.id]);
      agencyIds = rows.map((row) => row.id);
    }
    const marks = agencyIds ? agencyIds.map(() => '?').join(',') : '';
    const scoped = (column) => (agencyIds === null ? '' : agencyIds.length ? ` AND ${column} IN (${marks})` : ' AND 1=0');
    const sp = agencyIds || [];

    const requestedYear = Number.parseInt(req.query.annee, 10);
    const [seasons] = await pool.execute('SELECT id, libelle, annee, est_active FROM saisons_hajj ORDER BY est_active DESC, annee DESC');
    const season = seasons.find((item) => Number(item.annee) === requestedYear) || seasons.find((item) => item.est_active) || seasons[0]
      || { id: null, libelle: `Hajj ${new Date().getFullYear()}`, annee: new Date().getFullYear(), est_active: false };
    const year = Number(season.annee);

    const [[dossiers]] = await pool.execute(
      `SELECT COUNT(DISTINCT d.pelerin_id) AS total_pelerins, COUNT(*) AS total_dossiers,
        COALESCE(SUM(d.statut IN ('valide','transmis_nusuk','confirme')),0) AS dossiers_valides,
        COALESCE(SUM(d.statut IN ('soumis','en_verification')),0) AS dossiers_a_traiter
       FROM dossiers d WHERE d.annee_hajj=?${scoped('d.agence_id')}`, [year, ...sp]);
    const [[documents]] = await pool.execute(
      `SELECT COALESCE(SUM(doc.statut='APPROVED'),0) AS documents_valides, COALESCE(SUM(doc.statut='REJECTED'),0) AS documents_rejetes,
        COALESCE(SUM(doc.statut IN ('PENDING','UNDER_REVIEW')),0) AS documents_a_verifier
       FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id WHERE d.annee_hajj=?${scoped('d.agence_id')}`, [year, ...sp]);
    const [[money]] = await pool.execute(
      `SELECT COALESCE(SUM(CASE WHEN p.statut='valide' THEN p.montant END),0) AS paiements_recus,
        COALESCE(SUM(CASE WHEN p.statut='en_attente' THEN p.montant END),0) AS paiements_en_attente
       FROM paiements p JOIN dossiers d ON d.id=p.dossier_id WHERE d.annee_hajj=?${scoped('d.agence_id')}`, [year, ...sp]);
    const [[balance]] = await pool.execute(
      `SELECT COALESCE(SUM(GREATEST(f.prix-COALESCE(paid.total_paye,0),0)),0) AS solde_restant,
        COUNT(DISTINCT CASE WHEN f.prix>COALESCE(paid.total_paye,0) THEN d.pelerin_id END) AS pelerins_avec_solde
       FROM dossiers d JOIN forfaits f ON f.id=d.forfait_id
       LEFT JOIN (SELECT dossier_id, SUM(montant) AS total_paye FROM paiements WHERE statut='valide' GROUP BY dossier_id) paid ON paid.dossier_id=d.id
       WHERE d.annee_hajj=?${scoped('d.agence_id')}`, [year, ...sp]);
    const [[groups]] = await pool.execute(
      `SELECT COUNT(*) AS groupes_formes, COALESCE(SUM(g.encadreur_id IS NULL),0) AS groupes_sans_guide,
        (SELECT COUNT(DISTINCT gm.pelerin_id) FROM groupe_membres gm JOIN groupes_pelerins g2 ON g2.id=gm.groupe_id WHERE g2.annee_hajj=?${scoped('g2.agence_id')}) AS pelerins_affectes
       FROM groupes_pelerins g WHERE g.annee_hajj=?${scoped('g.agence_id')}`, [year, ...sp, year, ...sp]);
    const [[guides]] = await pool.execute(
      `SELECT COUNT(*) AS guides_actifs FROM encadreurs e JOIN utilisateurs u ON u.id=e.utilisateur_id WHERE u.est_actif=TRUE${scoped('e.agence_id')}`, [...sp]);
    const [[operations]] = await pool.execute(
      `SELECT (SELECT COUNT(*) FROM voyages v WHERE 1=1${scoped('v.agence_id')}) AS voyages,
        (SELECT COUNT(*) FROM incidents i WHERE i.statut IN ('OPEN','IN_PROGRESS')${scoped('i.agence_id')}) AS incidents_ouverts,
        (SELECT COUNT(*) FROM cours c WHERE c.statut='PUBLISHED' AND c.debut_le>=UTC_TIMESTAMP()${scoped('c.agence_id')}) AS cours_a_venir`, [...sp, ...sp, ...sp]);

    const [statuses] = await pool.execute(
      `SELECT d.statut, COUNT(*) AS total FROM dossiers d WHERE d.annee_hajj=?${scoped('d.agence_id')} GROUP BY d.statut ORDER BY total DESC`, [year, ...sp]);
    const [monthly] = await pool.execute(
      `SELECT a.month, SUM(a.inscriptions) AS inscriptions, SUM(a.documents) AS documents, SUM(a.paiements) AS paiements FROM (
         SELECT MONTH(d.cree_le) AS month, COUNT(*) AS inscriptions, 0 AS documents, 0 AS paiements FROM dossiers d WHERE d.annee_hajj=? AND YEAR(d.cree_le)=YEAR(CURRENT_DATE)${scoped('d.agence_id')} GROUP BY MONTH(d.cree_le)
         UNION ALL SELECT MONTH(doc.cree_le), 0, COUNT(*), 0 FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id WHERE d.annee_hajj=? AND YEAR(doc.cree_le)=YEAR(CURRENT_DATE)${scoped('d.agence_id')} GROUP BY MONTH(doc.cree_le)
         UNION ALL SELECT MONTH(p.cree_le), 0, 0, COUNT(*) FROM paiements p JOIN dossiers d ON d.id=p.dossier_id WHERE d.annee_hajj=? AND YEAR(p.cree_le)=YEAR(CURRENT_DATE)${scoped('d.agence_id')} GROUP BY MONTH(p.cree_le)
       ) a GROUP BY a.month ORDER BY a.month`, [year, ...sp, year, ...sp, year, ...sp]);
    // « detail » = valeur brute (statut / type) : le front la traduit dans la langue de l'utilisateur.
    const [activities] = await pool.execute(
      `SELECT * FROM (
         SELECT 'dossier' AS type, d.numero_dossier AS reference, h.statut AS detail, CONCAT_WS(' ', actor.prenom, actor.nom) AS acteur,
           DATE_FORMAT(h.cree_le,'%Y-%m-%dT%H:%i:%sZ') AS cree_le, NULL AS montant
         FROM historique_statuts h JOIN dossiers d ON d.id=h.dossier_id LEFT JOIN utilisateurs actor ON actor.id=h.modifie_par WHERE d.annee_hajj=?${scoped('d.agence_id')}
         UNION ALL
         SELECT 'paiement', d.numero_dossier, p.statut, CONCAT_WS(' ', pil.prenom, pil.nom), DATE_FORMAT(p.cree_le,'%Y-%m-%dT%H:%i:%sZ'), p.montant
         FROM paiements p JOIN dossiers d ON d.id=p.dossier_id JOIN utilisateurs pil ON pil.id=d.pelerin_id WHERE d.annee_hajj=?${scoped('d.agence_id')}
         UNION ALL
         SELECT 'document', d.numero_dossier, doc.type_document, CONCAT_WS(' ', pil.prenom, pil.nom), DATE_FORMAT(doc.cree_le,'%Y-%m-%dT%H:%i:%sZ'), NULL
         FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id JOIN utilisateurs pil ON pil.id=d.pelerin_id WHERE d.annee_hajj=?${scoped('d.agence_id')}
       ) x ORDER BY cree_le DESC LIMIT 12`, [year, ...sp, year, ...sp, year, ...sp]);

    res.json({
      succes: true,
      generated_at: new Date().toISOString(),
      dashboard: { saison: season, saisons: seasons, indicateurs: { ...dossiers, ...documents, ...money, ...balance, ...groups, ...guides, ...operations }, statuts: statuses, evolution: monthly, activite: activities },
    });
  } catch (error) { next(error); }
};

module.exports = { getOverview };
