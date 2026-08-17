import { DOSSIER_STATUS } from './statuses.js';

/**
 * Transitions de statut autorisées depuis chaque état. Centralisé ici
 * pour qu'aucune UI (web ou mobile) ne puisse proposer une transition
 * incohérente — le backend doit appliquer la même règle côté serveur,
 * ceci n'est qu'un garde-fou côté client pour l'UX.
 */
export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  [DOSSIER_STATUS.BROUILLON]: [DOSSIER_STATUS.SOUMIS, DOSSIER_STATUS.ANNULE],
  [DOSSIER_STATUS.SOUMIS]: [
    DOSSIER_STATUS.EN_VERIFICATION,
    DOSSIER_STATUS.REJETE,
    DOSSIER_STATUS.ANNULE,
  ],
  [DOSSIER_STATUS.EN_VERIFICATION]: [DOSSIER_STATUS.VALIDE, DOSSIER_STATUS.REJETE],
  [DOSSIER_STATUS.VALIDE]: [DOSSIER_STATUS.TRANSMIS_NUSUK, DOSSIER_STATUS.ANNULE],
  [DOSSIER_STATUS.TRANSMIS_NUSUK]: [DOSSIER_STATUS.CONFIRME, DOSSIER_STATUS.REJETE],
  [DOSSIER_STATUS.CONFIRME]: [],
  [DOSSIER_STATUS.REJETE]: [DOSSIER_STATUS.SOUMIS], // le pèlerin corrige et resoumet
  [DOSSIER_STATUS.ANNULE]: [],
});

export function getAllowedNextStatuses(currentStatus) {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
}

export function canTransitionTo(currentStatus, nextStatus) {
  return getAllowedNextStatuses(currentStatus).includes(nextStatus);
}
