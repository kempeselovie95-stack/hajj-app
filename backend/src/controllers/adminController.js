const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

const listerAgences = async (_req, res, next) => {
  try {
    const [agences] = await pool.execute(`
      SELECT a.id, a.nom_agence, a.numero_agrement, a.adresse, a.cree_le,
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
      [nom, prenom, email.toLowerCase().trim(), telephone || null, await bcrypt.hash(mot_de_passe, 12)]
    );
    const [agencyResult] = await connection.execute(
      `INSERT INTO agences (utilisateur_id, nom_agence, numero_agrement, adresse) VALUES (?, ?, ?, ?)`,
      [userResult.insertId, nom_agence, numero_agrement || null, adresse || null]
    );
    await connection.commit();
    res.status(201).json({ succes: true, agence_id: agencyResult.insertId, utilisateur_id: userResult.insertId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
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
      [nom, prenom, email.toLowerCase().trim(), telephone || null, await bcrypt.hash(mot_de_passe, 12)]
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

module.exports = { listerAgences, creerAgence, listerEncadreurs, creerEncadreur, obtenirStatistiques, supprimerEncadreur, supprimerAgence };
