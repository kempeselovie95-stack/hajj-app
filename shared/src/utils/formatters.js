/**
 * Formatteurs purs, sans dépendance UI, réutilisés par web et mobile.
 * `Intl` est disponible nativement sur les deux plateformes (Hermes
 * inclut de bonnes données ICU depuis RN 0.70+), donc pas besoin d'une
 * lib de dates supplémentaire pour ce besoin simple.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** @param {string|Date} value @returns {string} ex: "14 août 2026" */
export function formatDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_FORMATTER.format(date);
}

/** @param {string|Date} value @returns {string} ex: "14 août 2026 à 09:41" */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return DATETIME_FORMATTER.format(date).replace(' à', ' à');
}

/**
 * Progression documentaire d'un dossier, ex: "3/5 documents validés".
 * @param {Array<{ type: string, statut: string }>} documents
 * @param {string[]} requiredTypes
 */
export function formatDocumentProgress(documents, requiredTypes) {
  const validatedCount = requiredTypes.filter((type) =>
    documents.some((doc) => doc.type === type && doc.statut === 'valide')
  ).length;
  return `${validatedCount}/${requiredTypes.length} documents validés`;
}
