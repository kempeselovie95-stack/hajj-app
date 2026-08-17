/**
 * Statuts possibles d'un dossier de pèlerinage.
 * Reflète la colonne `statut` de la table `dossiers` et alimente
 * `historique_statuts` à chaque transition.
 */
export const DOSSIER_STATUS = Object.freeze({
  BROUILLON: 'brouillon',           // créé, pas encore soumis par le pèlerin
  SOUMIS: 'soumis',                 // soumis par le pèlerin, en attente de revue agence
  EN_VERIFICATION: 'en_verification', // documents en cours de contrôle par l'agence
  VALIDE: 'valide',                 // validé par l'agence, prêt pour transmission NUSUK
  TRANSMIS_NUSUK: 'transmis_nusuk', // transmis à la plateforme NUSUK
  CONFIRME: 'confirme',             // confirmation reçue de NUSUK
  REJETE: 'rejete',                 // rejeté (documents invalides, etc.)
  ANNULE: 'annule',                 // annulé par le pèlerin ou l'agence
});

export const DOSSIER_STATUS_LABELS = Object.freeze({
  [DOSSIER_STATUS.BROUILLON]: 'Brouillon',
  [DOSSIER_STATUS.SOUMIS]: 'Soumis',
  [DOSSIER_STATUS.EN_VERIFICATION]: 'En vérification',
  [DOSSIER_STATUS.VALIDE]: 'Validé',
  [DOSSIER_STATUS.TRANSMIS_NUSUK]: 'Transmis à NUSUK',
  [DOSSIER_STATUS.CONFIRME]: 'Confirmé',
  [DOSSIER_STATUS.REJETE]: 'Rejeté',
  [DOSSIER_STATUS.ANNULE]: 'Annulé',
});

/**
 * Couleurs sémantiques par statut, exprimées en tokens de thème
 * (voir theme.js) plutôt qu'en valeurs brutes, pour rester cohérent
 * entre web (CSS vars) et mobile (StyleSheet).
 */
export const DOSSIER_STATUS_COLOR = Object.freeze({
  [DOSSIER_STATUS.BROUILLON]: 'neutral',
  [DOSSIER_STATUS.SOUMIS]: 'info',
  [DOSSIER_STATUS.EN_VERIFICATION]: 'warning',
  [DOSSIER_STATUS.VALIDE]: 'success',
  [DOSSIER_STATUS.TRANSMIS_NUSUK]: 'info',
  [DOSSIER_STATUS.CONFIRME]: 'success',
  [DOSSIER_STATUS.REJETE]: 'danger',
  [DOSSIER_STATUS.ANNULE]: 'neutral',
});

/** Ordre chronologique attendu du parcours normal d'un dossier */
export const DOSSIER_STATUS_FLOW = [
  DOSSIER_STATUS.BROUILLON,
  DOSSIER_STATUS.SOUMIS,
  DOSSIER_STATUS.EN_VERIFICATION,
  DOSSIER_STATUS.VALIDE,
  DOSSIER_STATUS.TRANSMIS_NUSUK,
  DOSSIER_STATUS.CONFIRME,
];

/** Statuts de document (indépendants du statut global du dossier) */
export const DOCUMENT_STATUS = Object.freeze({
  EN_ATTENTE: 'en_attente',
  VALIDE: 'valide',
  REJETE: 'rejete',
});

export const DOCUMENT_STATUS_LABELS = Object.freeze({
  [DOCUMENT_STATUS.EN_ATTENTE]: 'En attente',
  [DOCUMENT_STATUS.VALIDE]: 'Validé',
  [DOCUMENT_STATUS.REJETE]: 'Rejeté',
});

export const DOCUMENT_STATUS_COLOR = Object.freeze({
  [DOCUMENT_STATUS.EN_ATTENTE]: 'warning',
  [DOCUMENT_STATUS.VALIDE]: 'success',
  [DOCUMENT_STATUS.REJETE]: 'danger',
});
