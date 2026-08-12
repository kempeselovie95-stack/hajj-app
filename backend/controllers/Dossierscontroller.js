/**
 * Controller des dossiers pèlerins
 * Gère : liste, détail, création, mise à jour du statut
 */

const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { envoyerNotification } = require('../services/notificationService');

// ── Messages de statut lisibles pour les notifications ────────────────────────
const LABELS_STATUT = {
  en_attente: 'En attente',
  en_cours:   'En cours de traitement',
  valide:     'Validé ✅',
  rejete:     'Rejeté',
  annule:     'Annulé',
};

// ── Générer un numéro de dossier unique ───────────────────────────────────────
const genererNumeroDossier = async () => {
  const annee = new Date().getFullYear();
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as total FROM dossiers WHERE annee_hajj = ?',
    [annee]
  );
  const numero = String(rows[0].total + 1).padStart(4, '0');
  return `DOS-${annee}-${numero}`;
};

// ── Lister les dossiers (selon le rôle) ──────────────────────────────────────
const listerDossiers = async (req, res, next) => {
  try {
    const { role, id } = req.utilisateur;
    const { statut, page = 1, limite = 10 } = req.query;

    let whereClause = '';
    let params = [];

    if (role === 'pelerin') {
      // Un pèlerin ne voit que ses propres dossiers
      whereClause = 'WHERE d.pelerin_id = ?';
      params = [id];
    } else if (role === 'agence') {
      const [agence] = await pool.execute(
        'SELECT id FROM agences WHERE utilisateur_id = ?', [id]
      );
      whereClause = agence.length ? 'WHERE d.agence_id = ?' : 'WHERE 1=0';
      params = agence.length ? [agence[0].id] : [];
    }

    if (statut) {
      whereClause += whereClause ? ' AND d.statut = ?' : 'WHERE d.statut = ?';
      params.push(statut);
    }

    const offset = (parseInt(page) - 1) * parseInt(limite);

    const [dossiers] = await pool.execute(
      `SELECT
         d.id, d.numero_dossier, d.annee_hajj, d.statut,
         d.type_package, d.date_depart, d.date_retour, d.cree_le,
         CONCAT(u.prenom, ' ', u.nom) AS pelerin_nom,
         a.nom_agence
       FROM dossiers d
       INNER JOIN utilisateurs u ON u.id = d.pelerin_id
       LEFT JOIN  agences a      ON a.id = d.agence_id
       ${whereClause}
       ORDER BY d.cree_le DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limite), offset]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM dossiers d ${whereClause}`,
      params
    );

    res.json({
      succes: true,
      dossiers,
      pagination: {
        page:       parseInt(page),
        limite:     parseInt(limite),
        total:      countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limite),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Détail d'un dossier ───────────────────────────────────────────────────────
const obtenirDossier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT
         d.*,
         CONCAT(u.prenom, ' ', u.nom) AS pelerin_nom,
         u.email AS pelerin_email,
         u.telephone AS pelerin_telephone,
         a.nom_agence
       FROM dossiers d
       INNER JOIN utilisateurs u ON u.id = d.pelerin_id
       LEFT JOIN  agences a      ON a.id = d.agence_id
       WHERE d.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ succes: false, message: 'Dossier introuvable' });
    }

    // Contrôle d'accès : un pèlerin ne voit que son dossier
    const dossier = rows[0];
    if (req.utilisateur.role === 'pelerin' && dossier.pelerin_id !== req.utilisateur.id) {
      return res.status(403).json({ succes: false, message: 'Accès non autorisé à ce dossier' });
    }

    // Récupérer les documents associés
    const [documents] = await pool.execute(
      'SELECT id, type_document, nom_fichier, est_valide, cree_le FROM documents WHERE dossier_id = ?',
      [id]
    );

    // Récupérer l'historique des statuts
    const [historique] = await pool.execute(
      `SELECT h.statut, h.commentaire, h.cree_le, CONCAT(u.prenom, ' ', u.nom) AS modifie_par
       FROM historique_statuts h
       LEFT JOIN utilisateurs u ON u.id = h.modifie_par
       WHERE h.dossier_id = ?
       ORDER BY h.cree_le DESC`,
      [id]
    );

    res.json({ succes: true, dossier: { ...dossier, documents, historique } });
  } catch (error) {
    next(error);
  }
};

// ── Créer un dossier ──────────────────────────────────────────────────────────
const creerDossier = async (req, res, next) => {
  try {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
      return res.status(400).json({ succes: false, erreurs: erreurs.array() });
    }

    const { annee_hajj, type_package, agence_id } = req.body;
    const pelerin_id = req.utilisateur.id;

    const numeroDossier = await genererNumeroDossier();

    const [resultat] = await pool.execute(
      `INSERT INTO dossiers (pelerin_id, agence_id, numero_dossier, annee_hajj, type_package)
       VALUES (?, ?, ?, ?, ?)`,
      [pelerin_id, agence_id || null, numeroDossier, annee_hajj, type_package || 'standard']
    );

    // Enregistrer dans l'historique
    await pool.execute(
      `INSERT INTO historique_statuts (dossier_id, statut, commentaire, modifie_par)
       VALUES (?, 'en_attente', 'Dossier créé', ?)`,
      [resultat.insertId, pelerin_id]
    );

    res.status(201).json({
      succes: true,
      message: 'Dossier créé avec succès',
      dossier_id:     resultat.insertId,
      numero_dossier: numeroDossier,
    });
  } catch (error) {
    next(error);
  }
};

// ── Mettre à jour le statut d'un dossier ─────────────────────────────────────
const mettreAJourStatut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut, commentaire } = req.body;

    const [dossiers] = await pool.execute(
      'SELECT d.*, u.fcm_token FROM dossiers d INNER JOIN utilisateurs u ON u.id = d.pelerin_id WHERE d.id = ?',
      [id]
    );

    if (!dossiers.length) {
      return res.status(404).json({ succes: false, message: 'Dossier introuvable' });
    }

    await pool.execute(
      'UPDATE dossiers SET statut = ? WHERE id = ?',
      [statut, id]
    );

    // Enregistrer dans l'historique
    await pool.execute(
      `INSERT INTO historique_statuts (dossier_id, statut, commentaire, modifie_par)
       VALUES (?, ?, ?, ?)`,
      [id, statut, commentaire || null, req.utilisateur.id]
    );

    // Notifier le pèlerin via FCM si token disponible
    const { fcm_token, numero_dossier } = dossiers[0];
    if (fcm_token) {
      await envoyerNotification(
        fcm_token,
        `Dossier ${numero_dossier} — Mise à jour`,
        `Votre statut est maintenant : ${LABELS_STATUT[statut] || statut}`
      );
    }

    // Créer une notification en base
    await pool.execute(
      `INSERT INTO notifications (destinataire_id, titre, corps, type)
       VALUES (?, ?, ?, ?)`,
      [
        dossiers[0].pelerin_id,
        `Dossier ${numero_dossier} mis à jour`,
        `Votre dossier est maintenant : ${LABELS_STATUT[statut] || statut}. ${commentaire || ''}`,
        statut === 'valide' ? 'succes' : statut === 'rejete' ? 'erreur' : 'info',
      ]
    );

    res.json({ succes: true, message: 'Statut mis à jour avec succès' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listerDossiers, obtenirDossier, creerDossier, mettreAJourStatut };