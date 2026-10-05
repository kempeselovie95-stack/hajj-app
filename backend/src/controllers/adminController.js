const bcrypt = require('bcryptjs');
const { assignGroup } = require('../services/onboarding');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

const listerAgences = async (_req, res, next) => {
  try {
    const [agences] = await pool.execute(`
      SELECT a.id, a.nom_agence AS name, a.legal_name, a.numero_agrement AS registration_number,
        a.country, a.city, a.adresse AS address, a.phone, a.email, a.logo, a.status,
        a.subscription_plan, a.subscription_status, a.cree_le AS created_at, a.updated_at,
        u.id AS utilisateur_id, u.nom, u.prenom, u.email, u.telephone, u.est_actif,
        (SELECT COUNT(*) FROM encadreurs e WHERE e.agence_id = a.id) AS total_encadreurs,
        (SELECT COUNT(*) FROM dossiers d WHERE d.agence_id = a.id) AS total_dossiers
      FROM agences a JOIN utilisateurs u ON u.id = a.utilisateur_id
      ORDER BY a.nom_agence
    `);
    res.json({ succes: true, agences });
  } catch (error) { next(error); }
};

const creerAgence = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const { nom, prenom, email, telephone, mot_de_passe, nom_agence, numero_agrement, adresse } = req.body;
    await connection.beginTransaction();
    const [userResult] = await connection.execute(
      `INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role) VALUES (?, ?, ?, ?, ?, 'agence')`,
      [nom, prenom, email.toLowerCase().trim(), telephone?.trim() || '', await bcrypt.hash(mot_de_passe, 12)]
    );
    const [agencyResult] = await connection.execute(
      `INSERT INTO agences (utilisateur_id,nom_agence,numero_agrement,adresse,legal_name,country,phone,email)
       VALUES (?,?,?,?,?,?,?,?)`,
      [userResult.insertId, nom_agence, numero_agrement || null, adresse || null, nom_agence, 'Cameroun', telephone || null, email.toLowerCase().trim()]
    );
    await connection.commit();
    res.status(201).json({ succes: true, agence_id: agencyResult.insertId, utilisateur_id: userResult.insertId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};

const creerPelerinAvecDossier = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
  const connection = await pool.getConnection();
  try {
    const { nom, prenom, email, telephone, mot_de_passe, saison_id, forfait_id, agence_id = null } = req.body;
    await connection.beginTransaction();
    const [seasonRows] = await connection.execute('SELECT id,annee FROM saisons_hajj WHERE id=?', [saison_id]);
    const season = seasonRows[0];
    if (!season) {
      await connection.rollback();
      return res.status(400).json({ succes: false, message: 'Saison Hajj introuvable.' });
    }
    const [packageRows] = await connection.execute(
      'SELECT id,saison_id FROM forfaits WHERE id=? AND est_actif=TRUE',
      [forfait_id]
    );
    const selectedPackage = packageRows[0];
    if (!selectedPackage || Number(selectedPackage.saison_id) !== Number(season.id)) {
      await connection.rollback();
      return res.status(400).json({ succes: false, message: 'Le forfait doit appartenir à la saison sélectionnée.' });
    }
    if (agence_id) {
      const [agencyRows] = await connection.execute('SELECT id FROM agences WHERE id=?', [agence_id]);
      if (!agencyRows.length) {
        await connection.rollback();
        return res.status(400).json({ succes: false, message: 'Organisation introuvable.' });
      }
    }

    const [userResult] = await connection.execute(
      `INSERT INTO utilisateurs (nom,prenom,email,telephone,mot_de_passe,role)
       VALUES (?,?,?,?,?,'pelerin')`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), telephone?.trim() || '', await bcrypt.hash(mot_de_passe, 12)]
    );
    const numeroDossier = `DOS-${season.annee}-${String(userResult.insertId).padStart(6, '0')}`;
    const [dossierResult] = await connection.execute(
      `INSERT INTO dossiers (pelerin_id,agence_id,numero_dossier,annee_hajj,statut,type_package,saison_id,forfait_id)
       VALUES (?,?,?,?,'brouillon','standard',?,?)`,
      [userResult.insertId, agence_id, numeroDossier, season.annee, season.id, selectedPackage.id]
    );
    await connection.execute(
      `INSERT INTO historique_statuts (dossier_id,statut,commentaire,modifie_par)
       VALUES (?,'brouillon','Dossier créé par l’administration',?)`,
      [dossierResult.insertId, req.utilisateur.id]
    );
    await connection.execute(
      `INSERT INTO notifications (destinataire_id,titre,corps,type)
       VALUES (?, 'Compte et dossier créés', ?, 'info')`,
      [userResult.insertId, `Votre compte pèlerin est prêt. Votre dossier ${numeroDossier} a été créé pour la saison Hajj ${season.annee}.`]
    );
    if (agence_id) await assignGroup(connection, userResult.insertId, agence_id, Number(season.annee));
    await connection.commit();
    res.status(201).json({
      succes: true,
      pelerin_id: userResult.insertId,
      dossier_id: dossierResult.insertId,
      numero_dossier: numeroDossier,
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ succes: false, message: 'Cette adresse email est déjà utilisée.' });
    next(error);
  } finally { connection.release(); }
};

const modifierOrganisation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
  try {
    const fields = {
      name: 'nom_agence', legal_name: 'legal_name', registration_number: 'numero_agrement', country: 'country',
      city: 'city', address: 'adresse', phone: 'phone', email: 'email', logo: 'logo', status: 'status',
      subscription_plan: 'subscription_plan', subscription_status: 'subscription_status',
    };
    const updates = Object.entries(fields).filter(([key]) => req.body[key] !== undefined);
    if (!updates.length) return res.status(400).json({ succes: false, message: 'Aucune information à modifier.' });
    const [exists] = await pool.execute('SELECT id FROM agences WHERE id=?', [req.params.id]);
    if (!exists.length) return res.status(404).json({ succes: false, message: 'Organisation introuvable.' });
    const assignments = updates.map(([, column]) => `\`${column}\`=?`).join(',');
    await pool.execute(`UPDATE agences SET ${assignments} WHERE id=?`, [...updates.map(([key]) => req.body[key] || null), req.params.id]);
    res.json({ succes: true, message: 'Organisation mise à jour.' });
  } catch (error) { next(error); }
};

const listerEncadreurs = async (_req, res, next) => {
  try {
    const [encadreurs] = await pool.execute(`
      SELECT e.utilisateur_id AS id, u.nom, u.prenom, u.email, u.telephone, u.est_actif,
        a.id AS agence_id, a.nom_agence,
        (SELECT COUNT(*) FROM groupes_pelerins g WHERE g.encadreur_id = e.utilisateur_id) AS total_groupes,
        (SELECT COUNT(*) FROM groupe_membres gm JOIN groupes_pelerins g ON g.id = gm.groupe_id WHERE g.encadreur_id = e.utilisateur_id) AS total_pelerins
      FROM encadreurs e JOIN utilisateurs u ON u.id = e.utilisateur_id JOIN agences a ON a.id = e.agence_id
      ORDER BY u.nom, u.prenom
    `);
    res.json({ succes: true, encadreurs });
  } catch (error) { next(error); }
};

const creerEncadreur = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const { nom, prenom, email, telephone, mot_de_passe, agence_id } = req.body;
    await connection.beginTransaction();
    const [agencyRows] = await connection.execute('SELECT id FROM agences WHERE id = ?', [agence_id]);
    if (!agencyRows.length) {
      await connection.rollback();
      return res.status(400).json({ succes: false, message: 'Agence introuvable' });
    }
    const [userResult] = await connection.execute(
      `INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role) VALUES (?, ?, ?, ?, ?, 'encadreur')`,
      [nom, prenom, email.toLowerCase().trim(), telephone?.trim() || '', await bcrypt.hash(mot_de_passe, 12)]
    );
    await connection.execute('INSERT INTO encadreurs (utilisateur_id, agence_id) VALUES (?, ?)', [userResult.insertId, agence_id]);
    await connection.commit();
    res.status(201).json({ succes: true, encadreur_id: userResult.insertId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};

const obtenirStatistiques = async (_req, res, next) => {
  try {
    const [[summary]] = await Promise.all([
      pool.execute(`SELECT
        (SELECT COUNT(*) FROM dossiers) AS total_dossiers,
        (SELECT COUNT(*) FROM agences) AS total_agences,
        (SELECT COUNT(*) FROM utilisateurs WHERE role='pelerin') AS total_pelerins,
        (SELECT COUNT(*) FROM utilisateurs WHERE role='encadreur' AND est_actif=TRUE) AS total_encadreurs,
        (SELECT COUNT(*) FROM dossiers WHERE statut NOT IN ('confirme','annule')) AS dossiers_actifs`),
    ]);
    const [statuts] = await pool.execute('SELECT statut, COUNT(*) AS total FROM dossiers GROUP BY statut');
    res.json({ succes: true, resume: summary[0], statuts });
  } catch (error) { next(error); }
};

const obtenirDashboard = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ succes: false, erreurs: errors.array() });
    const requestedYear = Number.parseInt(req.query.annee, 10);
    const [seasons] = await pool.execute(
      `SELECT id, libelle, annee, est_active FROM saisons_hajj ORDER BY est_active DESC, annee DESC`
    );
    const season = seasons.find((item) => Number(item.annee) === requestedYear)
      || seasons.find((item) => item.est_active)
      || seasons[0]
      || { id: null, libelle: `Hajj ${new Date().getFullYear()}`, annee: new Date().getFullYear(), est_active: false };
    const year = Number(season.annee);
    const [[metrics]] = await pool.execute(
      `SELECT
        COUNT(DISTINCT d.pelerin_id) AS total_pelerins,
        COUNT(d.id) AS total_dossiers,
        SUM(d.statut IN ('valide','transmis_nusuk','confirme')) AS dossiers_valides,
        SUM(d.statut = 'transmis_nusuk') AS transmis_nusuk,
        (SELECT COUNT(*) FROM documents doc JOIN dossiers dd ON dd.id=doc.dossier_id WHERE dd.annee_hajj=? AND doc.est_valide=TRUE) AS documents_valides,
        (SELECT COUNT(*) FROM documents doc JOIN dossiers dd ON dd.id=doc.dossier_id WHERE dd.annee_hajj=? AND doc.est_valide=FALSE) AS documents_rejetes,
        (SELECT COUNT(*) FROM documents doc JOIN dossiers dd ON dd.id=doc.dossier_id WHERE dd.annee_hajj=? AND doc.est_valide IS NULL) AS documents_a_verifier,
        (SELECT COALESCE(SUM(p.montant),0) FROM paiements p JOIN dossiers dp ON dp.id=p.dossier_id WHERE dp.annee_hajj=? AND p.statut='valide') AS paiements_recus,
        (SELECT COALESCE(SUM(GREATEST(f.prix-COALESCE(paid.total_paye,0),0)),0)
         FROM dossiers balance_d
         JOIN forfaits f ON f.id=balance_d.forfait_id
         LEFT JOIN (SELECT dossier_id,SUM(montant) AS total_paye FROM paiements WHERE statut='valide' GROUP BY dossier_id) paid ON paid.dossier_id=balance_d.id
         WHERE balance_d.annee_hajj=?) AS solde_restant,
        (SELECT COUNT(DISTINCT balance_d.pelerin_id)
         FROM dossiers balance_d
         JOIN forfaits f ON f.id=balance_d.forfait_id
         LEFT JOIN (SELECT dossier_id,SUM(montant) AS total_paye FROM paiements WHERE statut='valide' GROUP BY dossier_id) paid ON paid.dossier_id=balance_d.id
         WHERE balance_d.annee_hajj=? AND f.prix>COALESCE(paid.total_paye,0)) AS pelerins_avec_solde,
        (SELECT COUNT(*) FROM groupes_pelerins g WHERE g.annee_hajj=?) AS groupes_formes,
        (SELECT COUNT(*) FROM groupes_pelerins g WHERE g.annee_hajj=? AND g.encadreur_id IS NULL) AS groupes_sans_guide,
        (SELECT COUNT(DISTINCT gm.pelerin_id) FROM groupe_membres gm JOIN groupes_pelerins g ON g.id=gm.groupe_id WHERE g.annee_hajj=?) AS pelerins_affectes,
        (SELECT COUNT(*) FROM encadreurs e JOIN utilisateurs u ON u.id=e.utilisateur_id WHERE u.est_actif=TRUE) AS guides_actifs
       FROM dossiers d WHERE d.annee_hajj=?`,
      Array(10).fill(year)
    );

    const [statuses] = await pool.execute(
      `SELECT statut, COUNT(*) AS total FROM dossiers WHERE annee_hajj=? GROUP BY statut ORDER BY total DESC`,
      [year]
    );
    const [monthly] = await pool.execute(
      `SELECT activity.month, SUM(activity.inscriptions) AS inscriptions, SUM(activity.documents) AS documents, SUM(activity.paiements) AS paiements
       FROM (
        SELECT MONTH(d.cree_le) AS month, COUNT(*) AS inscriptions, 0 AS documents, 0 AS paiements FROM dossiers d WHERE d.annee_hajj=? AND YEAR(d.cree_le)=YEAR(CURRENT_DATE) GROUP BY MONTH(d.cree_le)
         UNION ALL
        SELECT MONTH(doc.cree_le), 0, COUNT(*), 0 FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id WHERE d.annee_hajj=? AND YEAR(doc.cree_le)=YEAR(CURRENT_DATE) GROUP BY MONTH(doc.cree_le)
         UNION ALL
        SELECT MONTH(p.cree_le), 0, 0, COUNT(*) FROM paiements p JOIN dossiers d ON d.id=p.dossier_id WHERE d.annee_hajj=? AND YEAR(p.cree_le)=YEAR(CURRENT_DATE) GROUP BY MONTH(p.cree_le)
       ) activity GROUP BY activity.month ORDER BY activity.month`,
      [year, year, year]
    );
    const [activities] = await pool.execute(
      `SELECT * FROM (
         SELECT 'dossier' AS type, d.numero_dossier AS reference, CONCAT('Statut du dossier : ', h.statut) AS description,
           CONCAT_WS(' ', actor.prenom, actor.nom) AS acteur, h.cree_le AS cree_le, NULL AS montant
         FROM historique_statuts h JOIN dossiers d ON d.id=h.dossier_id LEFT JOIN utilisateurs actor ON actor.id=h.modifie_par
         WHERE d.annee_hajj=?
         UNION ALL
         SELECT 'paiement', d.numero_dossier, CONCAT('Paiement ', p.statut), CONCAT_WS(' ', pilgrim.prenom, pilgrim.nom), p.cree_le, p.montant
         FROM paiements p JOIN dossiers d ON d.id=p.dossier_id JOIN utilisateurs pilgrim ON pilgrim.id=d.pelerin_id
         WHERE d.annee_hajj=?
         UNION ALL
         SELECT 'document', d.numero_dossier, CONCAT('Document ajouté : ', doc.type_document), CONCAT_WS(' ', pilgrim.prenom, pilgrim.nom), doc.cree_le, NULL
         FROM documents doc JOIN dossiers d ON d.id=doc.dossier_id JOIN utilisateurs pilgrim ON pilgrim.id=d.pelerin_id
         WHERE d.annee_hajj=?
       ) activity ORDER BY cree_le DESC LIMIT 12`,
      [year, year, year]
    );

    res.json({ succes: true, dashboard: { saison: season, saisons: seasons, indicateurs: metrics, statuts: statuses, evolution: monthly, activite: activities } });
  } catch (error) { next(error); }
};

const supprimerEncadreur = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute("SELECT id FROM utilisateurs WHERE id=? AND role='encadreur' FOR UPDATE", [req.params.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ succes: false, message: 'Encadreur introuvable' }); }
    await connection.execute('UPDATE groupes_pelerins SET encadreur_id=NULL WHERE encadreur_id=?', [req.params.id]);
    await connection.execute('DELETE FROM encadreurs WHERE utilisateur_id=?', [req.params.id]);
    await connection.execute('DELETE FROM utilisateurs WHERE id=?', [req.params.id]);
    await connection.commit();
    res.json({ succes: true, message: 'Encadreur supprimé. Ses groupes sont de nouveau disponibles.' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

const supprimerAgence = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT utilisateur_id FROM agences WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ succes: false, message: 'Agence introuvable' }); }
    const [encadreurs] = await connection.execute('SELECT utilisateur_id FROM encadreurs WHERE agence_id=?', [req.params.id]);
    await connection.execute('DELETE FROM agences WHERE id=?', [req.params.id]);
    for (const encadreur of encadreurs) await connection.execute('DELETE FROM utilisateurs WHERE id=?', [encadreur.utilisateur_id]);
    await connection.execute('DELETE FROM utilisateurs WHERE id=?', [rows[0].utilisateur_id]);
    await connection.commit();
    res.json({ succes: true, message: 'Agence supprimée.' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

module.exports = { listerAgences, creerAgence, creerPelerinAvecDossier, modifierOrganisation, listerEncadreurs, creerEncadreur, obtenirStatistiques, obtenirDashboard, supprimerEncadreur, supprimerAgence };
