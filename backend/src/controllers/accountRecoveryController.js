/**
 * Récupération de compte (« mot de passe oublié » par code à 6 chiffres) et connexion avec Google.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { ensurePilgrimSetup } = require('../services/onboarding');
const { sendMail } = require('../services/mailer');

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const isProduction = () => process.env.NODE_ENV === 'production';
const secret = () => process.env.JWT_SECRET || (isProduction() ? null : 'dev-only-change-me');
const signToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = ({ mot_de_passe: _password, reset_code_hash: _hash, reset_expire: _expire, reset_tentatives: _attempts, ...user }) => user;

/** Configuration publique utile aux applications (identifiant client Google). */
const authConfig = (_req, res) => res.json({ succes: true, google_client_id: process.env.GOOGLE_CLIENT_ID || null, google_maps_key: process.env.GOOGLE_MAPS_API_KEY || null });

/** Demande d'un code de réinitialisation. Réponse identique que le compte existe ou non (pas d'énumération). */
const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ succes: false, message: 'Email invalide' });
    const generic = { succes: true, message: 'Si un compte existe pour cette adresse, un code de récupération vient d’être envoyé.' };
    const [rows] = await pool.execute('SELECT id, prenom FROM utilisateurs WHERE email=? AND est_actif=TRUE', [email]);
    if (!rows.length) return res.json(generic);
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await pool.execute(
      'UPDATE utilisateurs SET reset_code_hash=?, reset_expire=DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), reset_tentatives=0 WHERE id=?',
      [await bcrypt.hash(code, 8), CODE_TTL_MINUTES, rows[0].id]);
    const delivered = await sendMail({
      to: email,
      subject: 'MyHajj237 — code de récupération de compte',
      text: `Bonjour ${rows[0].prenom},\n\nVotre code de récupération est : ${code}\nIl expire dans ${CODE_TTL_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    });
    // En développement (ou sans service e-mail configuré hors production), le code est renvoyé pour pouvoir tester.
    res.json(!isProduction() && !delivered ? { ...generic, dev_code: code } : generic);
  } catch (error) { next(error); }
};

/** Réinitialisation : e-mail + code + nouveau mot de passe. */
const resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const code = String(req.body.code || '').trim();
    const password = String(req.body.mot_de_passe || '');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ succes: false, code: 'WEAK_PASSWORD', message: 'Mot de passe : 8 caractères minimum, une majuscule et un chiffre.' });
    }
    const [rows] = await pool.execute('SELECT id, reset_code_hash, reset_tentatives, (reset_expire > UTC_TIMESTAMP()) AS valide FROM utilisateurs WHERE email=? AND est_actif=TRUE', [email]);
    const user = rows[0];
    const invalid = () => res.status(400).json({ succes: false, code: 'INVALID_CODE', message: 'Code invalide ou expiré.' });
    if (!user || !user.reset_code_hash || !user.valide || user.reset_tentatives >= MAX_ATTEMPTS) return invalid();
    if (!(await bcrypt.compare(code, user.reset_code_hash))) {
      await pool.execute('UPDATE utilisateurs SET reset_tentatives=reset_tentatives+1 WHERE id=?', [user.id]);
      return invalid();
    }
    await pool.execute('UPDATE utilisateurs SET mot_de_passe=?, reset_code_hash=NULL, reset_expire=NULL, reset_tentatives=0 WHERE id=?', [await bcrypt.hash(password, 12), user.id]);
    res.json({ succes: true, message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
  } catch (error) { next(error); }
};

/** Vérifie un jeton d'identité Google (Google Identity Services) auprès de Google. */
async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const url = `${process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo'}?id_token=${encodeURIComponent(credential)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const info = await response.json();
  const issuerOk = ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss);
  if (!issuerOk || info.aud !== clientId || String(info.email_verified) !== 'true' || !info.email) return null;
  return info;
}

/** Connexion / inscription avec Google : crée le pèlerin (dossier + groupe) s'il n'existe pas encore. */
const googleLogin = async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ succes: false, code: 'GOOGLE_NOT_CONFIGURED', message: 'La connexion Google n’est pas encore configurée sur ce serveur.' });
    const credential = String(req.body.credential || '');
    if (!credential) return res.status(400).json({ succes: false, message: 'Jeton Google manquant.' });
    let info = null;
    try { info = await verifyGoogleCredential(credential); } catch { return res.status(502).json({ succes: false, code: 'GOOGLE_UNREACHABLE', message: 'Impossible de contacter Google.' }); }
    if (!info) return res.status(401).json({ succes: false, code: 'GOOGLE_INVALID', message: 'Jeton Google invalide.' });

    const email = info.email.toLowerCase();
    const [rows] = await pool.execute('SELECT * FROM utilisateurs WHERE email=?', [email]);
    let user = rows[0];
    let created = false;
    if (user && !user.est_actif) return res.status(403).json({ succes: false, message: 'Compte désactivé.' });
    if (!user) {
      const [result] = await pool.execute(
        "INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role) VALUES (?,?,?,?,?,'pelerin')",
        [(info.family_name || info.name || email.split('@')[0]).slice(0, 100), (info.given_name || info.name || '').slice(0, 100) || '—', email, '', await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)]);
      const [fresh] = await pool.execute('SELECT * FROM utilisateurs WHERE id=?', [result.insertId]);
      user = fresh[0];
      created = true;
    }
    if (user.role === 'pelerin') await ensurePilgrimSetup(user.id);
    const safe = publicUser(user);
    res.status(created ? 201 : 200).json({ succes: true, nouveau: created, token: signToken(user), user: safe, utilisateur: safe });
  } catch (error) { next(error); }
};

module.exports = { authConfig, forgotPassword, resetPassword, googleLogin };
