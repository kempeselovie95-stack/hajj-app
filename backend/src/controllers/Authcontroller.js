/**
 * Controller d'authentification
 * Gère : connexion, inscription, déconnexion, renouvellement token
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { ensurePilgrimSetup } = require('../services/onboarding');

async function affecterGroupeDisponible(utilisateurId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [agencyRows] = await connection.execute('SELECT agence_id FROM encadreurs WHERE utilisateur_id=? FOR UPDATE', [utilisateurId]);
    if (!agencyRows.length) {
      await connection.commit();
      return null;
    }
    const [groups] = await connection.execute('SELECT id FROM groupes_pelerins WHERE agence_id=? AND encadreur_id IS NULL ORDER BY cree_le ASC LIMIT 1 FOR UPDATE', [agencyRows[0].agence_id]);
    if (!groups.length) {
      await connection.commit();
      return null;
    }
    await connection.execute('UPDATE groupes_pelerins SET encadreur_id=? WHERE id=? AND encadreur_id IS NULL', [utilisateurId, groups[0].id]);
    await connection.commit();
    return groups[0].id;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

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

    const groupeAssigne = utilisateur.role === 'encadreur' ? await affecterGroupeDisponible(utilisateur.id) : null;
    if (utilisateur.role === 'pelerin') await ensurePilgrimSetup(utilisateur.id); // comptes existants : dossier + groupe si absents
    const token = genererToken(utilisateur);

    // Ne jamais renvoyer le mot de passe hashé
    const { mot_de_passe: _, ...utilisateurSansMdp } = utilisateur;

    res.json({
      succes: true,
      message: 'Connexion réussie',
      token,
      user: utilisateurSansMdp,
      utilisateur: utilisateurSansMdp,
      groupe_assigne_id: groupeAssigne,
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

    const { nom, prenom, email, telephone, mot_de_passe, agence_id } = req.body;

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

    const setup = await ensurePilgrimSetup(resultat.insertId, { agenceId: Number(agence_id) || null });
    const token = genererToken(nouvelUtilisateur);

    res.status(201).json({
      succes: true,
      message: 'Compte créé avec succès',
      token,
      user: nouvelUtilisateur,
      utilisateur: nouvelUtilisateur,
      dossier_id: setup.dossierId,
      groupe_id: setup.groupId,
    });
  } catch (error) {
    next(error);
  }
};

// ── Profil utilisateur connecté ───────────────────────────────────────────────
const obtenirProfil = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, nom, prenom, email, telephone, role, theme, created_at AS cree_le
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

const mettreAJourProfil = async (req, res, next) => {
  try {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) return res.status(400).json({ succes: false, erreurs: erreurs.array() });
    const { nom, prenom, email, telephone, mot_de_passe, ancien_mot_de_passe, theme } = req.body;
    const [currentRows] = await pool.execute('SELECT mot_de_passe, telephone FROM utilisateurs WHERE id=?', [req.utilisateur.id]);
    if (!currentRows.length) return res.status(404).json({ succes: false, message: 'Utilisateur introuvable' });
    if (mot_de_passe) {
      if (!ancien_mot_de_passe || !(await bcrypt.compare(ancien_mot_de_passe, currentRows[0].mot_de_passe))) return res.status(400).json({ succes: false, message: 'Ancien mot de passe incorrect' });
    }
    // Mise à jour partielle : seuls les champs fournis sont modifiés (le mot de passe se change seul depuis « Sécurité »).
    const sets = []; const values = [];
    if (theme !== undefined) { sets.push('theme=?'); values.push(theme); }
    if (nom !== undefined) { sets.push('nom=?'); values.push(nom); }
    if (prenom !== undefined) { sets.push('prenom=?'); values.push(prenom); }
    if (email !== undefined) { sets.push('email=?'); values.push(email.toLowerCase().trim()); }
    if (telephone !== undefined) { sets.push('telephone=?'); values.push(telephone || currentRows[0].telephone || ''); }
    if (mot_de_passe) { sets.push('mot_de_passe=?'); values.push(await bcrypt.hash(mot_de_passe, 12)); }
    if (!sets.length) return res.status(400).json({ succes: false, message: 'Aucune modification fournie' });
    const query = `UPDATE utilisateurs SET ${sets.join(', ')} WHERE id=?`; values.push(req.utilisateur.id);
    await pool.execute(query, values);
    const [rows] = await pool.execute('SELECT id,nom,prenom,email,telephone,role,theme FROM utilisateurs WHERE id=?', [req.utilisateur.id]);
    res.json({ succes: true, user: rows[0], utilisateur: rows[0] });
  } catch (error) { next(error); }
};

module.exports = { seConnecter, sInscrire, obtenirProfil, mettreAJourFcmToken, mettreAJourProfil };