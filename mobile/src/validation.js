/** Validation des formulaires d'authentification : retourne des clés de traduction (pas des textes). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CM_REGEX = /^(?:\+237)?6[0-9]{8}$/;

export function validateLogin({ email, password }) {
  return {
    email: !email.trim() ? 'emailRequired' : EMAIL_REGEX.test(email.trim()) ? null : 'invalidEmail',
    password: password ? null : 'passwordRequired',
  };
}

export function validateRegistration({ nom, prenom, email, telephone, password, confirmation }) {
  return {
    nom: nom.trim() ? null : 'reg_nameRequired',
    prenom: prenom.trim() ? null : 'reg_firstNameRequired',
    email: !email.trim() ? 'emailRequired' : EMAIL_REGEX.test(email.trim()) ? null : 'invalidEmail',
    telephone: !telephone.trim() ? 'reg_phoneRequired' : PHONE_CM_REGEX.test(telephone.trim().replace(/\s/g, '')) ? null : 'reg_phoneInvalid',
    password: !password ? 'passwordRequired' : password.length < 8 ? 'reg_passwordMin' : null,
    confirmation: !confirmation ? 'reg_confirmRequired' : password !== confirmation ? 'reg_confirmMismatch' : null,
  };
}

export const hasErrors = (errors) => Object.values(errors).some(Boolean);
