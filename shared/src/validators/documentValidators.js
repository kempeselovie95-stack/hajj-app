import { DOCUMENT_UPLOAD_CONSTRAINTS } from '../constants/documentTypes.js';

/**
 * Valide un fichier avant upload (côté client, en complément du contrôle
 * serveur qui reste la source de vérité).
 * @param {{ mimeType: string, size: number }} file
 * @returns {?string} message d'erreur ou null
 */
export function validateDocumentFile(file) {
  if (!file) return 'Aucun fichier sélectionné.';

  const { ACCEPTED_MIME_TYPES, MAX_SIZE_BYTES } = DOCUMENT_UPLOAD_CONSTRAINTS;

  if (!ACCEPTED_MIME_TYPES.includes(file.mimeType)) {
    return 'Format non supporté (JPEG, PNG ou PDF uniquement).';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Fichier trop volumineux (max ${MAX_SIZE_BYTES / (1024 * 1024)} Mo).`;
  }
  return null;
}
