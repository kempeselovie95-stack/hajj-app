/**
 * Types et constantes de structure des données
 * Sert de référence commune entre web et mobile
 *
 * En JavaScript pur, ces objets servent de documentation vivante.
 * Si tu migres vers TypeScript plus tard, remplace par des interfaces.
 */

// ── Rôles utilisateurs ────────────────────────────────────────────────────────
const ROLES = Object.freeze({
  ADMIN:   'admin',
  AGENCE:  'agence',
  PELERIN: 'pelerin',
});

// ── Statuts de dossier ────────────────────────────────────────────────────────
const STATUTS_DOSSIER = Object.freeze({
  EN_ATTENTE: 'en_attente',
  EN_COURS:   'en_cours',
  VALIDE:     'valide',
  REJETE:     'rejete',
  ANNULE:     'annule',
});

// ── Labels lisibles pour l'interface ─────────────────────────────────────────
const LABELS_STATUT = Object.freeze({
  en_attente: 'En attente',
  en_cours:   'En cours',
  valide:     'Validé',
  rejete:     'Rejeté',
  annule:     'Annulé',
});

// ── Couleurs de statut (utilisées dans web ET mobile) ────────────────────────
const COULEURS_STATUT = Object.freeze({
  en_attente: '#C9A84C', // or islamique
  en_cours:   '#2A6B9C', // bleu
  valide:     '#2E7D32', // vert
  rejete:     '#C62828', // rouge
  annule:     '#757575', // gris
});

// ── Types de documents ────────────────────────────────────────────────────────
const TYPES_DOCUMENT = Object.freeze({
  PASSEPORT:           'passeport',
  PHOTO:               'photo',
  CERTIFICAT_MEDICAL:  'certificat_medical',
  ACTE_NAISSANCE:      'acte_naissance',
  AUTRE:               'autre',
});

const LABELS_DOCUMENT = Object.freeze({
  passeport:          'Passeport',
  photo:              'Photo d\'identité',
  certificat_medical: 'Certificat médical',
  acte_naissance:     'Acte de naissance',
  autre:              'Autre document',
});

// ── Packages Hajj ─────────────────────────────────────────────────────────────
const TYPES_PACKAGE = Object.freeze({
  ECONOMIQUE: 'economique',
  STANDARD:   'standard',
  PREMIUM:    'premium',
});

module.exports = {
  ROLES,
  STATUTS_DOSSIER,
  LABELS_STATUT,
  COULEURS_STATUT,
  TYPES_DOCUMENT,
  LABELS_DOCUMENT,
  TYPES_PACKAGE,
};