const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

const listSaisons = async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, libelle, annee, date_debut, date_fin, description, est_active, cree_le
       FROM saisons_hajj ORDER BY annee DESC`
    );
    res.json({ succes: true, saisons: rows });
  } catch (error) {
    next(error);
  }
};

const createSaison = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ succes: false, erreurs: errors.array() });
    }

    const { libelle, annee, date_debut, date_fin, description, est_active = true } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO saisons_hajj (libelle, annee, date_debut, date_fin, description, est_active)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE libelle = VALUES(libelle), date_debut = VALUES(date_debut), date_fin = VALUES(date_fin), description = VALUES(description), est_active = VALUES(est_active)`,
      [libelle, annee, date_debut || null, date_fin || null, description || null, est_active ? 1 : 0]
    );

    const insertedId = result.insertId || (await pool.execute('SELECT id FROM saisons_hajj WHERE annee = ? LIMIT 1', [annee]))[0][0]?.id;

    res.status(201).json({
      succes: true,
      message: 'Saison Hajj enregistrée.',
      saison_id: insertedId,
    });
  } catch (error) {
    next(error);
  }
};

const listForfaits = async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.id, f.saison_id, s.libelle AS saison_libelle, s.annee, f.nom, f.description, f.prix, f.devise,
              f.inclus, f.est_actif, f.cree_le
       FROM forfaits f
       JOIN saisons_hajj s ON s.id = f.saison_id
       ORDER BY s.annee DESC, f.prix DESC`
    );
    res.json({ succes: true, forfaits: rows });
  } catch (error) {
    next(error);
  }
};

const createForfait = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ succes: false, erreurs: errors.array() });
    }

    const { saison_id, nom, description, prix, devise = 'XAF', inclus, est_actif = true } = req.body;

    const [seasonRows] = await pool.execute('SELECT id FROM saisons_hajj WHERE id = ?', [saison_id]);
    if (!seasonRows.length) {
      return res.status(404).json({ succes: false, message: 'Saison introuvable.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO forfaits (saison_id, nom, description, prix, devise, inclus, est_actif)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), prix = VALUES(prix), devise = VALUES(devise), inclus = VALUES(inclus), est_actif = VALUES(est_actif)`,
      [saison_id, nom, description || null, Number(prix), devise, inclus || null, est_actif ? 1 : 0]
    );

    const insertedId = result.insertId || (await pool.execute('SELECT id FROM forfaits WHERE saison_id = ? AND nom = ? LIMIT 1', [saison_id, nom]))[0][0]?.id;

    res.status(201).json({
      succes: true,
      message: 'Forfait enregistré.',
      forfait_id: insertedId,
    });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (_req, res, next) => {
  try {
    const [saisons] = await pool.execute('SELECT * FROM saisons_hajj ORDER BY annee DESC');
    const [forfaits] = await pool.execute(
      `SELECT f.id, f.saison_id, s.libelle AS saison_libelle, s.annee, f.nom, f.prix, f.devise
       FROM forfaits f
       JOIN saisons_hajj s ON s.id = f.saison_id
       ORDER BY s.annee DESC, f.prix DESC`
    );
    const [totals] = await pool.execute(
      `SELECT
         COUNT(*) AS total_paiements,
         COALESCE(SUM(CASE WHEN statut = 'valide' THEN montant ELSE 0 END), 0) AS total_paye,
         COALESCE(SUM(CASE WHEN statut <> 'valide' THEN montant ELSE 0 END), 0) AS total_a_payer
       FROM paiements`
    );

    const dashboard = {
      totalSaisons: saisons.length,
      totalForfaits: forfaits.length,
      totalPaiements: Number(totals[0]?.total_paiements || 0),
      totalPaye: Number(totals[0]?.total_paye || 0),
      totalAPayer: Number(totals[0]?.total_a_payer || 0),
      saisons,
      forfaits,
    };

    res.json({ succes: true, dashboard });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listSaisons,
  createSaison,
  listForfaits,
  createForfait,
  getDashboard,
};
