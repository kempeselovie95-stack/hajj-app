/**
 * Validateurs purs (aucune dépendance UI) réutilisés par les formulaires
 * web (React) et mobile (React Native). Chaque fonction retourne un
 * message d'erreur en français, ou `null` si le champ est valide —
 * ce contrat permet un `errors[field] = validate(value)` direct côté UI.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Téléphone camerounais : 9 chiffres, avec ou sans indicatif +237 */
const PHONE_CM_REGEX = /^(?:\+237)?6[0-9]{8}$/;

export function validateEmail(value) {
  if (!value || !value.trim()) return "L'email est requis.";
  if (!EMAIL_REGEX.test(value.trim())) return 'Format d\'email invalide.';
  return null;
}

export function validatePassword(value) {
  if (!value) return 'Le mot de passe est requis.';
  if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  return null;
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return 'La confirmation du mot de passe est requise.';
  if (password !== confirmation) return 'Les mots de passe ne correspondent pas.';
  return null;
}

export function validatePhoneCameroon(value) {
  if (!value || !value.trim()) return 'Le numéro de téléphone est requis.';
  if (!PHONE_CM_REGEX.test(value.trim().replace(/\s/g, ''))) {
    return 'Numéro invalide (format attendu : 6XXXXXXXX).';
  }
  return null;
}

export function validateRequired(value, fieldLabel = 'Ce champ') {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${fieldLabel} est requis.`;
  }
  return null;
}

/**
 * Valide un objet de formulaire de connexion.
 * @returns {{email: ?string, password: ?string}} messages d'erreur par champ
 */
export function validateLoginForm({ email, password }) {
  return {
    email: validateEmail(email),
    password: password ? null : 'Le mot de passe est requis.',
  };
}

/**
 * Valide un objet de formulaire d'inscription pèlerin.
 * @returns {Record<string, ?string>} messages d'erreur par champ
 */
export function validateRegisterForm({ nom, prenom, email, telephone, password, confirmation }) {
  return {
    nom: validateRequired(nom, 'Le nom'),
    prenom: validateRequired(prenom, 'Le prénom'),
    email: validateEmail(email),
    telephone: validatePhoneCameroon(telephone),
    password: validatePassword(password),
    confirmation: validatePasswordConfirmation(password, confirmation),
  };
}

/** Utilitaire : true si l'objet d'erreurs ne contient que des `null` */
export function isFormValid(errors) {
  return Object.values(errors).every((msg) => !msg);
}
