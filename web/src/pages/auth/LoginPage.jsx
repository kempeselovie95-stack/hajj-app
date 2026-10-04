import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { validateLoginForm, isFormValid } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import FormField from '../../components/common/FormField.jsx';
import GeometricPattern from '../../components/common/GeometricPattern.jsx';
import LanguageSelector from '../../components/common/LanguageSelector.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // On efface l'erreur du champ dès que l'utilisateur corrige — évite
    // l'effet "message qui reste collé" après une frappe.
    setErrors((prev) => ({ ...prev, [name]: null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);

    const validation = validateLoginForm(form);
    const localizedValidation = {
      email: validation.email ? (form.email.trim() ? 'invalidEmail' : 'emailRequired') : null,
      password: form.password ? null : 'passwordRequired',
    };
    setErrors(localizedValidation);
    if (!isFormValid(localizedValidation)) return;

    setIsSubmitting(true);
    try {
      await login(form.email, form.password);
      const redirectTo = location.state?.from?.pathname;
      navigate(redirectTo || '/', { replace: true });
    } catch (err) {
      setServerError(err.status === 401 ? 'invalidCredentials' : 'loginError');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <GeometricPattern className="pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md">
        <div className="mb-4 flex justify-end"><LanguageSelector /></div>
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">{t('loginKicker')}</p>
          <h1 className="font-display text-3xl font-semibold text-text-primary">{t('welcome')}</h1>
          <p className="mt-2 font-body text-text-secondary">{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-5">
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger"
            >
              {t(serverError)}
            </div>
          )}

          <FormField
            id="email"
            label={t('emailField')}
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email ? t(errors.email) : null}
            placeholder={t('emailField')}
            autoComplete="email"
            required
          />

          <FormField
            id="password"
            label={t('passwordField')}
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password ? t(errors.password) : null}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-text-secondary">
          {t('newPilgrim')}{' '}
          <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
}
