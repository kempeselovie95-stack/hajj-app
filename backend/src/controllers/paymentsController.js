const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

const getPaymentScope = (user) => user.role === 'agence'
  ? { clause: 'AND d.agence_id IN (SELECT id FROM agences WHERE utilisateur_id=?)', values: [user.id] }
  : { clause: '', values: [] };

const listerPaiements = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const requestedYear = Number.parseInt(req.query.annee, 10);
    const [seasons] = await pool.execute('SELECT id,libelle,annee,est_active FROM saisons_hajj ORDER BY est_active DESC,annee DESC');
    const season = seasons.find((item) => Number(item.annee) === requestedYear)
      || seasons.find((item) => item.est_active)
      || seasons[0]
      || { id: null, libelle: 'Saison courante', annee: new Date().getFullYear() };
    const year = Number(season.annee);
    const scope = getPaymentScope(req.utilisateur);

    const [paiements] = await pool.execute(
      `SELECT p.id,p.dossier_id,p.montant,p.devise,p.statut,p.moyen_paiement,p.reference,p.commentaire,p.cree_le,p.confirme_le,
        d.numero_dossier,d.annee_hajj,d.qr_token,CONCAT(u.prenom,' ',u.nom) AS pelerin_nom,u.telephone AS pelerin_tel,u.email AS pelerin_email,
        ag.nom_agence AS agence_nom,f.nom AS forfait_nom,CAST(f.prix AS DOUBLE) AS forfait_prix,
        (SELECT COALESCE(SUM(x.montant),0) FROM paiements x WHERE x.dossier_id=p.dossier_id AND x.statut='valide') AS total_paye
       FROM paiements p
       JOIN dossiers d ON d.id=p.dossier_id
       JOIN utilisateurs u ON u.id=d.pelerin_id
       LEFT JOIN agences ag ON ag.id=d.agence_id
       LEFT JOIN forfaits f ON f.id=p.forfait_id
       WHERE d.annee_hajj=? ${scope.clause}
       ORDER BY p.cree_le DESC,p.id DESC LIMIT 250`,
      [year, ...scope.values]
    );
    // Le reçu porte le QR Code du pèlerin (jeton opaque déjà utilisé pour le pointage) : on le crée au besoin.
    for (const payment of paiements) {
      if (payment.statut === 'valide' && !payment.qr_token) {
        const token = require('crypto').randomBytes(24).toString('hex');
        await pool.execute('UPDATE dossiers SET qr_token=? WHERE id=? AND qr_token IS NULL', [token, payment.dossier_id]);
        const [[fresh]] = await pool.execute('SELECT qr_token FROM dossiers WHERE id=?', [payment.dossier_id]);
        for (const other of paiements) if (other.dossier_id === payment.dossier_id) other.qr_token = fresh.qr_token;
      }
    }
    const [dossiers] = await pool.execute(
      `SELECT d.id,d.numero_dossier,d.annee_hajj,d.statut,d.forfait_id,CONCAT(u.prenom,' ',u.nom) AS pelerin_nom,
        f.nom AS forfait_nom,f.prix AS forfait_prix,f.devise,
        COALESCE(SUM(CASE WHEN p.statut IN ('en_attente','valide') THEN p.montant ELSE 0 END),0) AS montant_reserve,
        COALESCE(SUM(CASE WHEN p.statut='valide' THEN p.montant ELSE 0 END),0) AS montant_paye
       FROM dossiers d
       JOIN utilisateurs u ON u.id=d.pelerin_id
       LEFT JOIN forfaits f ON f.id=d.forfait_id
       LEFT JOIN paiements p ON p.dossier_id=d.id
       WHERE d.annee_hajj=? AND d.statut<>'annule' ${scope.clause}
       GROUP BY d.id ORDER BY u.nom,u.prenom`,
      [year, ...scope.values]
    );
    const [forfaits] = await pool.execute(
      `SELECT f.id,f.nom,f.prix,f.devise,s.annee,s.libelle AS saison_libelle
       FROM forfaits f JOIN saisons_hajj s ON s.id=f.saison_id
       WHERE s.annee=? AND f.est_actif=TRUE ORDER BY f.prix,f.nom`,
      [year]
    );
    const [[summary]] = await pool.execute(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN p.statut='valide' THEN p.montant ELSE 0 END),0) AS encaisse,
        COALESCE(SUM(CASE WHEN p.statut='en_attente' THEN p.montant ELSE 0 END),0) AS enAttente
       FROM paiements p JOIN dossiers d ON d.id=p.dossier_id
       WHERE d.annee_hajj=? ${scope.clause}`,
      [year, ...scope.values]
    );
    const stats = { total: Number(summary.total), encaisse: Number(summary.encaisse), enAttente: Number(summary.enAttente) };

    res.json({ succes: true, saison: season, saisons: seasons, paiements, dossiers, forfaits, statistiques: stats });
  } catch (error) { next(error); }
};

const creerPaiement = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [dossierRows] = await connection.execute(
      `SELECT d.id,d.annee_hajj,d.saison_id,d.forfait_id,d.agence_id,a.utilisateur_id AS agence_user_id
       FROM dossiers d LEFT JOIN agences a ON a.id=d.agence_id WHERE d.id=? FOR UPDATE`,
      [req.body.dossier_id]
    );
    const dossier = dossierRows[0];
    if (!dossier) {
      await connection.rollback();
      return res.status(404).json({ succes: false, message: 'Dossier introuvable.' });
    }
    if (req.utilisateur.role === 'agence' && Number(dossier.agence_user_id) !== Number(req.utilisateur.id)) {
      await connection.rollback();
      return res.status(403).json({ succes: false, message: 'Ce dossier ne dépend pas de votre agence.' });
    }

    const requestedPackageId = req.body.forfait_id ? Number(req.body.forfait_id) : null;
    if (dossier.forfait_id && requestedPackageId && Number(dossier.forfait_id) !== requestedPackageId) {
      await connection.rollback();
      return res.status(409).json({ succes: false, message: 'Un autre forfait est déjà associé à ce dossier.' });
    }
    const forfaitId = dossier.forfait_id || requestedPackageId;
    if (!forfaitId) {
      await connection.rollback();
      return res.status(400).json({ succes: false, message: 'Associez un forfait au dossier avant d’enregistrer un paiement.' });
    }

    const [forfaitRows] = await connection.execute(
      `SELECT f.id,f.prix,f.devise,f.saison_id,s.annee
       FROM forfaits f JOIN saisons_hajj s ON s.id=f.saison_id
       WHERE f.id=? AND f.est_actif=TRUE FOR UPDATE`,
      [forfaitId]
    );
    const forfait = forfaitRows[0];
    if (!forfait || Number(forfait.annee) !== Number(dossier.annee_hajj) || (dossier.saison_id && Number(forfait.saison_id) !== Number(dossier.saison_id))) {
      await connection.rollback();
      return res.status(400).json({ succes: false, message: 'Le forfait ne correspond pas à la saison du dossier.' });
    }

    const [reservedRows] = await connection.execute(
      `SELECT COALESCE(SUM(montant),0) AS reserve FROM paiements WHERE dossier_id=? AND statut IN ('en_attente','valide')`,
      [dossier.id]
    );
    const remaining = Math.max(0, Number(forfait.prix) - Number(reservedRows[0].reserve));
    const amount = Number(req.body.montant);
    if (amount > remaining) {
      await connection.rollback();
      return res.status(409).json({
        succes: false,
        message: `Le montant dépasse le solde disponible (${remaining.toLocaleString('fr-FR')} ${forfait.devise}).`,
        solde_disponible: remaining,
      });
    }

    if (!dossier.forfait_id) {
      await connection.execute('UPDATE dossiers SET forfait_id=? WHERE id=?', [forfait.id, dossier.id]);
    }
    const [result] = await connection.execute(
      `INSERT INTO paiements (dossier_id,forfait_id,montant,devise,statut,moyen_paiement,reference,commentaire)
       VALUES (?,?,?,?,'en_attente',?,?,?)`,
      [dossier.id, forfait.id, amount, forfait.devise, req.body.moyen_paiement, req.body.reference || null, req.body.commentaire || null]
    );
    await connection.commit();
    res.status(201).json({ succes: true, paiement_id: result.insertId, statut: 'en_attente', solde_restant: remaining - amount });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};

const mettreAJourStatutPaiement = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT p.id,p.statut,d.agence_id,a.utilisateur_id AS agence_user_id
       FROM paiements p JOIN dossiers d ON d.id=p.dossier_id
       LEFT JOIN agences a ON a.id=d.agence_id WHERE p.id=? FOR UPDATE`,
      [req.params.id]
    );
    const payment = rows[0];
    if (!payment) {
      await connection.rollback();
      return res.status(404).json({ succes: false, message: 'Paiement introuvable.' });
    }
    if (req.utilisateur.role === 'agence' && Number(payment.agence_user_id) !== Number(req.utilisateur.id)) {
      await connection.rollback();
      return res.status(403).json({ succes: false, message: 'Ce paiement ne dépend pas de votre agence.' });
    }
    if (payment.statut !== 'en_attente') {
      await connection.rollback();
      return res.status(409).json({ succes: false, message: 'Seul un paiement en attente peut être traité.' });
    }
    await connection.execute(
      `UPDATE paiements SET statut=?,confirme_le=CASE WHEN ?='valide' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?`,
      [req.body.statut, req.body.statut, req.params.id]
    );
    await connection.commit();
    res.json({ succes: true, statut: req.body.statut });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};

module.exports = { listerPaiements, creerPaiement, mettreAJourStatutPaiement };