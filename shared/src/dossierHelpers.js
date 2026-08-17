import { REQUIRED_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from './constants/documentTypes.js';
import { DOCUMENT_STATUS } from './constants/statuses.js';

/**
 * Fusionne la liste des types de documents obligatoires avec les documents
 * réellement uploadés d'un dossier, pour obtenir une checklist complète
 * (y compris les documents encore manquants). Utilisé par le web
 * (DossierDetailPage) et le mobile (écran Documents pèlerin) — logique
 * identique, un seul endroit à corriger si la règle change.
 *
 * @param {Array<{type: string, statut: string}>} documents - documents existants du dossier
 * @returns {Array<{type: string, label: string, document: object|null}>}
 */
export function buildDocumentChecklist(documents = []) {
  return REQUIRED_DOCUMENT_TYPES.map((type) => ({
    type,
    label: DOCUMENT_TYPE_LABELS[type],
    document: documents.find((doc) => doc.type === type) ?? null,
  }));
}

/**
 * Calcule la progression documentaire d'un dossier.
 * @param {Array<{type: string, statut: string}>} documents
 * @returns {{ validated: number, total: number, percent: number }}
 */
export function computeDocumentProgress(documents = []) {
  const total = REQUIRED_DOCUMENT_TYPES.length;
  const validated = REQUIRED_DOCUMENT_TYPES.filter((type) =>
    documents.some((doc) => doc.type === type && doc.statut === DOCUMENT_STATUS.VALIDE)
  ).length;
  const percent = total === 0 ? 0 : Math.round((validated / total) * 100);
  return { validated, total, percent };
}

/** Un dossier est soumissible si tous les documents obligatoires sont au moins uploadés */
export function isDossierComplete(documents = []) {
  return REQUIRED_DOCUMENT_TYPES.every((type) => documents.some((doc) => doc.type === type));
}
