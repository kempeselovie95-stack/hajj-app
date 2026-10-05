/**
 * Processus de validation d'un dossier (agence / admin) jusqu'à NUSUK :
 *  soumis → en_verification → valide → transmis_nusuk → confirme   (rejet possible, re-soumission par le pèlerin)
 * Les contrôles ci-dessous sont appliqués par le serveur ; l'interface ne fait que les afficher.
 */
const { pool } = require('../config/database');

const REQUIRED_DOCUMENT_TYPES = ['passeport', 'photo_identite', 'certificat_medical', 'certificat_vaccination', 'preuve_paiement'];
const PASSPORT_MIN_VALIDITY_DAYS = 180;

/** Données saisies à chaque étape NUSUK. */
const STEP_REQUIREMENTS = {
  transmis_nusuk: { field: 'nusuk_reference', label: 'Référence de la demande NUSUK', max: 100 },
  confirme: { field: 'nusuk_visa', label: 'Numéro de visa / confirmation NUSUK', max: 100 },
};
const COMMENT_REQUIRED = new Set(['rejete']); // motif obligatoire (refus, pièces à corriger)

async function computeChecks(dossierId) {
  const [[dossier]] = await pool.execute(
    `SELECT d.id, d.forfait_id, d.annee_hajj, CAST(f.prix AS DOUBLE) AS prix FROM dossiers d LEFT JOIN forfaits f ON f.id=d.forfait_id WHERE d.id=?`, [dossierId]);
  const [documents] = await pool.execute('SELECT type_document, statut, expiration_date FROM documents WHERE dossier_id=?', [dossierId]);
  const [payments] = await pool.execute('SELECT statut, CAST(montant AS DOUBLE) AS montant FROM paiements WHERE dossier_id=?', [dossierId]);
  const [[group]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM groupe_membres m JOIN groupes_pelerins g ON g.id=m.groupe_id WHERE m.pelerin_id=(SELECT pelerin_id FROM dossiers WHERE id=?) AND g.annee_hajj=?`, [dossierId, dossier.annee_hajj]);

  const byType = new Map(documents.map((doc) => [doc.type_document, doc]));
  const missing = REQUIRED_DOCUMENT_TYPES.filter((type) => !byType.has(type));
  const notApproved = REQUIRED_DOCUMENT_TYPES.filter((type) => byType.has(type) && byType.get(type).statut !== 'APPROVED');
  const passport = byType.get('passeport');
  const limit = new Date(Date.now() + PASSPORT_MIN_VALIDITY_DAYS * 86400000);
  const passportOk = !!passport && passport.statut === 'APPROVED' && (!passport.expiration_date || new Date(passport.expiration_date) >= limit);
  const paid = payments.filter((p) => p.statut === 'valide').reduce((sum, p) => sum + p.montant, 0);
  const pending = payments.filter((p) => p.statut === 'en_attente').length;

  return {
    checks: [
      { key: 'documents_sent', ok: missing.length === 0, required: true, detail: missing },
      { key: 'documents_approved', ok: missing.length === 0 && notApproved.length === 0, required: true, detail: notApproved },
      { key: 'passport_validity', ok: passportOk, required: true, detail: passport?.expiration_date ? [String(passport.expiration_date).slice(0, 10)] : [] },
      { key: 'package', ok: !!dossier.forfait_id, required: true, detail: [] },
      { key: 'payment_complete', ok: !!dossier.prix && paid >= dossier.prix, required: true, detail: pending ? ['pending'] : [] },
      { key: 'group', ok: group.total > 0, required: false, detail: [] },
    ],
    solde: { total: dossier.prix || 0, paye: paid },
  };
}

module.exports = { REQUIRED_DOCUMENT_TYPES, STEP_REQUIREMENTS, COMMENT_REQUIRED, computeChecks };
