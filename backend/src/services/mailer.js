/**
 * Envoi d'e-mails : utilise nodemailer si le paquet est installé ET que SMTP_HOST est défini
 * (SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM). Sinon le message est écrit dans la console du serveur.
 * Retourne true si un e-mail a réellement été envoyé.
 */
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch { nodemailer = null; }

async function sendMail({ to, subject, text }) {
  if (nodemailer && process.env.SMTP_HOST) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
      await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
      return true;
    } catch (error) { console.warn('[mail] envoi impossible :', error.message); }
  }
  console.log(`[mail] (non envoyé, SMTP absent) à ${to} — ${subject}\n${text}`);
  return false;
}

module.exports = { sendMail };
