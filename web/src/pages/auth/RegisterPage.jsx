import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isFormValid } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import FormField from '../../components/common/FormField.jsx';
import GeometricPattern from '../../components/common/GeometricPattern.jsx';
import GoogleButton from '../../components/common/GoogleButton.jsx';
import LanguageSelector from '../../components/common/LanguageSelector.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const INITIAL_FORM = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  password: '',
  confirmation: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CM_REGEX = /^(?:\+237)?6[0-9]{8}$/;

/** Validation locale : retourne des clés de traduction (pas des textes) pour suivre la langue active. */
function validateRegistration({ nom, prenom, email, telephone, password, confirmation }) {
  return {
    nom: nom.trim() ? null : 'reg_nameRequired',
    prenom: prenom.trim() ? null : 'reg_firstNameRequired',
    email: !email.trim() ? 'emailRequired' : EMAIL_REGEX.test(email.trim()) ? null : 'invalidEmail',
    telephone: !telephone.trim() ? 'reg_phoneRequired' : PHONE_CM_REGEX.test(telephone.trim().replace(/\s/g, '')) ? null : 'reg_phoneInvalid',
    password: !password ? 'passwordRequired' : password.length < 8 ? 'reg_passwordMin' : null,
    confirmation: !confirmation ? 'reg_confirmRequired' : password !== confirmation ? 'reg_confirmMismatch' : null,
  };
}

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);
    const validation = validateRegistration(form);
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setIsSubmitting(true);
    try {
      const { confirmation, password, ...identity } = form;
      await register({ ...identity, mot_de_passe: password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.status === 409 ? t('duplicateEmail') : t('registrationError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <GeometricPattern className="pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-lg">
        <div className="mb-4 flex justify-end"><LanguageSelector /></div>
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">{t('loginKicker')}</p>
          <h1 className="font-display text-3xl font-semibold text-text-primary">{t('reg_title')}</h1>
          <p className="mt-2 font-body text-text-secondary">{t('reg_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-5">
          {serverError && <div role="alert" className="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">{serverError}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="nom" name="nom" label={t('lastName')} value={form.nom} onChange={handleChange} error={errors.nom ? t(errors.nom) : null} autoComplete="family-name" required />
            <FormField id="prenom" name="prenom" label={t('firstName')} value={form.prenom} onChange={handleChange} error={errors.prenom ? t(errors.prenom) : null} autoComplete="given-name" required />
          </div>
          <FormField id="email" name="email" label={t('emailField')} type="email" value={form.email} onChange={handleChange} error={errors.email ? t(errors.email) : null} autoComplete="email" required />
          <FormField id="telephone" name="telephone" label={t('phone')} value={form.telephone} onChange={handleChange} error={errors.telephone ? t(errors.telephone) : null} placeholder="6XXXXXXXX" autoComplete="tel" required />
          <FormField id="password" name="password" label={t('passwordField')} type="password" value={form.password} onChange={handleChange} error={errors.password ? t(errors.password) : null} autoComplete="new-password" required />
          <FormField id="confirmation" name="confirmation" label={t('confirmPassword')} type="password" value={form.confirmation} onChange={handleChange} error={errors.confirmation ? t(errors.confirmation) : null} autoComplete="new-password" required />
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? t('registering') : t('register')}</button>
          <GoogleButton onSuccess={() => navigate('/', { replace: true })} onError={setServerError} />
        </form>

        <p className="mt-6 text-center font-body text-sm text-text-secondary">
          {t('existingAccount')} <Link to="/login" className="font-medium text-primary hover:text-primary-hover">{t('signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
