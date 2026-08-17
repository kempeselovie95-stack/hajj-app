import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { validateLoginForm, isFormValid } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import FormField from '../../components/common/FormField.jsx';
import GeometricPattern from '../../components/common/GeometricPattern.jsx';

export default function LoginPage() {
  const { login } = useAuth();
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
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setIsSubmitting(true);
    try {
      await login(form.email, form.password);
      const redirectTo = location.state?.from?.pathname;
      navigate(redirectTo || '/', { replace: true });
    } catch (err) {
      setServerError(
        err.status === 401
          ? 'Email ou mot de passe incorrect.'
          : err.message || 'Une erreur est survenue. Réessaie.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <GeometricPattern className="pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Gestion du pèlerinage
          </p>
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Bienvenue
          </h1>
          <p className="mt-2 font-body text-text-secondary">
            Connecte-toi pour accéder à ton espace.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-5">
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger"
            >
              {serverError}
            </div>
          )}

          <FormField
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="nom@exemple.com"
            autoComplete="email"
            required
          />

          <FormField
            id="password"
            label="Mot de passe"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-text-secondary">
          Nouveau pèlerin ?{' '}
          <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
