/**
 * Types de documents attendus dans un dossier de pèlerinage.
 * Correspond à la colonne `type` de la table `documents`.
 */
export const DOCUMENT_TYPE = Object.freeze({
  PASSEPORT: 'passeport',
  PHOTO_IDENTITE: 'photo_identite',
  CERTIFICAT_MEDICAL: 'certificat_medical',
  CERTIFICAT_VACCINATION: 'certificat_vaccination',
  ACTE_NAISSANCE: 'acte_naissance',
  ATTESTATION_MAHRAM: 'attestation_mahram', // pour les pèlerines concernées
  PREUVE_PAIEMENT: 'preuve_paiement',
  VISA: 'visa',
});

export const DOCUMENT_TYPE_LABELS = Object.freeze({
  [DOCUMENT_TYPE.PASSEPORT]: 'Passeport',
  [DOCUMENT_TYPE.PHOTO_IDENTITE]: "Photo d'identité",
  [DOCUMENT_TYPE.CERTIFICAT_MEDICAL]: 'Certificat médical',
  [DOCUMENT_TYPE.CERTIFICAT_VACCINATION]: 'Certificat de vaccination',
  [DOCUMENT_TYPE.ACTE_NAISSANCE]: 'Acte de naissance',
  [DOCUMENT_TYPE.ATTESTATION_MAHRAM]: 'Attestation de Mahram',
  [DOCUMENT_TYPE.PREUVE_PAIEMENT]: 'Preuve de paiement',
  [DOCUMENT_TYPE.VISA]: 'Visa',
});

/** Documents obligatoires pour qu'un dossier soit soumissible */
export const REQUIRED_DOCUMENT_TYPES = [
  DOCUMENT_TYPE.PASSEPORT,
  DOCUMENT_TYPE.PHOTO_IDENTITE,
  DOCUMENT_TYPE.CERTIFICAT_MEDICAL,
  DOCUMENT_TYPE.CERTIFICAT_VACCINATION,
  DOCUMENT_TYPE.PREUVE_PAIEMENT,
];

/** Formats et taille acceptés pour l'upload (contrôlés aussi côté backend) */
export const DOCUMENT_UPLOAD_CONSTRAINTS = Object.freeze({
  ACCEPTED_MIME_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5 Mo
});
