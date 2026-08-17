/**
 * Types de notification. Sert à choisir l'icône et la couleur sémantique
 * dans l'UI (web ET mobile) sans dupliquer cette logique par plateforme.
 */
export const NOTIFICATION_TYPE = Object.freeze({
  STATUT_DOSSIER: 'statut_dossier',
  DOCUMENT_VALIDE: 'document_valide',
  DOCUMENT_REJETE: 'document_rejete',
  INFO: 'info',
});

export const NOTIFICATION_TYPE_ICON = Object.freeze({
  [NOTIFICATION_TYPE.STATUT_DOSSIER]: '📋',
  [NOTIFICATION_TYPE.DOCUMENT_VALIDE]: '✅',
  [NOTIFICATION_TYPE.DOCUMENT_REJETE]: '⚠️',
  [NOTIFICATION_TYPE.INFO]: 'ℹ️',
});

export const NOTIFICATION_TYPE_COLOR = Object.freeze({
  [NOTIFICATION_TYPE.STATUT_DOSSIER]: 'info',
  [NOTIFICATION_TYPE.DOCUMENT_VALIDE]: 'success',
  [NOTIFICATION_TYPE.DOCUMENT_REJETE]: 'danger',
  [NOTIFICATION_TYPE.INFO]: 'neutral',
});
