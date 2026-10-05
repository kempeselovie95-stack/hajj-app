import { Platform } from 'react-native';

/**
 * Prépare un fichier choisi (photo, galerie, PDF) pour un FormData.
 * - Mobile natif : React Native accepte l'objet { uri, name, type }.
 * - Web (Safari / Chrome via `expo start --web`) : il faut un vrai Blob/File, sinon le serveur reçoit "[object Object]".
 */
export async function toFormFile({ uri, name, mimeType }) {
  const type = mimeType || 'application/octet-stream';
  if (Platform.OS !== 'web') return { uri, name, type };
  const blob = await (await fetch(uri)).blob();
  return new File([blob], name, { type: blob.type || type });
}

/** Nom de fichier de repli, avec une extension cohérente avec le type MIME. */
export function fallbackName(base, mimeType) {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[mimeType] ?? 'bin';
  return `${base}.${extension}`;
}
