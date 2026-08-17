/**
 * Controller d'authentification
 * Gère : connexion, inscription, déconnexion, renouvellement token
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

// ── Génère un token JWT ───────────────────────────────────────────────────────
const genererToken = (utilisateur) => {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-me');
  if (!secret) throw new Error('JWT_SECRET est obligatoire en production');
  return jwt.sign(
    {
      id:    utilisateur.id,
      email: utilisateur.email,
      role:  utilisateur.role,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Connexion ─────────────────────────────────────────────────────────────────
const seConnecter = async (req, res, next) => {
  try {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
      return res.status(400).json({ succes: false, erreurs: erreurs.array() });
    }

    const { email, mot_de_passe } = req.body;

    const [rows] = await pool.execute(
      'SELECT * FROM utilisateurs WHERE email = ? AND est_actif = TRUE',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ succes: false, message: 'Email ou mot de passe incorrect' });
    }

    const utilisateur = rows[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ succes: false, message: 'Email ou mot de passe incorrect' });
    }

    const token = genererToken(utilisateur);

    // Ne jamais renvoyer le mot de passe hashé
    const { mot_de_passe: _, ...utilisateurSansMdp } = utilisateur;

    res.json({
      succes: true,
      message: 'Connexion réussie',
      token,
      user: utilisateurSansMdp,
      utilisateur: utilisateurSansMdp,
    });
  } catch (error) {
    next(error);
  }
};

// ── Inscription pèlerin ───────────────────────────────────────────────────────
const sInscrire = async (req, res, next) => {
  try {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
      return res.status(400).json({ succes: false, erreurs: erreurs.array() });
    }

    const { nom, prenom, email, telephone, mot_de_passe } = req.body;

    // Vérifier l'unicité de l'email
    const [existant] = await pool.execute(
      'SELECT id FROM utilisateurs WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existant.length) {
      return res.status(409).json({ succes: false, message: 'Cet email est déjà utilisé' });
    }

    const motDePasseHashe = await bcrypt.hash(mot_de_passe, 12);

    const [resultat] = await pool.execute(
      `INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role)
       VALUES (?, ?, ?, ?, ?, 'pelerin')`,
      [nom, prenom, email.toLowerCase().trim(), telephone, motDePasseHashe]
    );

    const nouvelUtilisateur = {
      id:        resultat.insertId,
      nom,
      prenom,
      email:     email.toLowerCase().trim(),
      telephone,
      role:      'pelerin',
    };

    const token = genererToken(nouvelUtilisateur);

    res.status(201).json({
      succes: true,
      message: 'Compte créé avec succès',
      token,
      user: nouvelUtilisateur,
      utilisateur: nouvelUtilisateur,
    });
  } catch (error) {
    next(error);
  }
};

// ── Profil utilisateur connecté ───────────────────────────────────────────────
const obtenirProfil = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nom, prenom, email, telephone, role, cree_le
       FROM utilisateurs WHERE id = ?`,
      [req.utilisateur.id]
    );

    if (!rows.length) {
      return res.status(404).json({ succes: false, message: 'Utilisateur introuvable' });
    }

    res.json({ succes: true, user: rows[0], utilisateur: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── Mise à jour du FCM token (notifications mobiles) ─────────────────────────
const mettreAJourFcmToken = async (req, res, next) => {
  try {
    const { fcm_token } = req.body;

    await pool.execute(
      'UPDATE utilisateurs SET fcm_token = ? WHERE id = ?',
      [fcm_token, req.utilisateur.id]
    );

    res.json({ succes: true, message: 'Token FCM mis à jour' });
  } catch (error) {
    next(error);
  }
};

module.exports = { seConnecter, sInscrire, obtenirProfil, mettreAJourFcmToken };