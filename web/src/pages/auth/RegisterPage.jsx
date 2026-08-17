import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isFormValid, validateRegisterForm } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import FormField from '../../components/common/FormField.jsx';
import GeometricPattern from '../../components/common/GeometricPattern.jsx';

const INITIAL_FORM = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  password: '',
  confirmation: '',
};

export default function RegisterPage() {
  const { register } = useAuth();
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
    const validation = validateRegisterForm(form);
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setIsSubmitting(true);
    try {
      const { confirmation, password, ...identity } = form;
      await register({ ...identity, mot_de_passe: password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.status === 409 ? 'Cet email est déjà utilisé.' : err.message || 'Impossible de créer le compte.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <GeometricPattern className="pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">Gestion du pèlerinage</p>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Créer un compte</h1>
          <p className="mt-2 font-body text-text-secondary">Inscris-toi pour accéder à ton espace pèlerin.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-5">
          {serverError && <div role="alert" className="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">{serverError}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="nom" name="nom" label="Nom" value={form.nom} onChange={handleChange} error={errors.nom} autoComplete="family-name" required />
            <FormField id="prenom" name="prenom" label="Prénom" value={form.prenom} onChange={handleChange} error={errors.prenom} autoComplete="given-name" required />
          </div>
          <FormField id="email" name="email" label="Email" type="email" value={form.email} onChange={handleChange} error={errors.email} autoComplete="email" required />
          <FormField id="telephone" name="telephone" label="Téléphone" value={form.telephone} onChange={handleChange} error={errors.telephone} placeholder="6XXXXXXXX" autoComplete="tel" required />
          <FormField id="password" name="password" label="Mot de passe" type="password" value={form.password} onChange={handleChange} error={errors.password} autoComplete="new-password" required />
          <FormField id="confirmation" name="confirmation" label="Confirmer le mot de passe" type="password" value={form.confirmation} onChange={handleChange} error={errors.confirmation} autoComplete="new-password" required />
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Création…' : 'Créer mon compte'}</button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-text-secondary">
          Déjà un compte ? <Link to="/login" className="font-medium text-primary hover:text-primary-hover">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
