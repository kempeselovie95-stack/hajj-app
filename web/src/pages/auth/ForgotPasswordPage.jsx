import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import FormField from '../../components/common/FormField.jsx';
import GeometricPattern from '../../components/common/GeometricPattern.jsx';
import LanguageSelector from '../../components/common/LanguageSelector.jsx';

/** Mot de passe oublié : 1) e-mail → code à 6 chiffres, 2) code + nouveau mot de passe. */
export default function ForgotPasswordPage() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [devCode, setDevCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError(t('invalidEmail')); return; }
    setBusy(true);
    try {
      const result = await api.auth.forgotPassword(email.trim());
      setDevCode(result.dev_code || '');
      setMessage(t('fp_codeSent'));
      setStep('reset');
    } catch { setError(t('fp_error')); } finally { setBusy(false); }
  }

  async function reset(event) {
    event.preventDefault();
    setError('');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) { setError(t('fp_weakPassword')); return; }
    if (password !== confirmation) { setError(t('reg_confirmMismatch')); return; }
    setBusy(true);
    try {
      await api.auth.resetPassword({ email: email.trim(), code: code.trim(), mot_de_passe: password });
      navigate('/login', { replace: true, state: { notice: t('fp_done') } });
    } catch (requestError) {
      setError(requestError.code === 'INVALID_CODE' ? t('fp_invalidCode') : requestError.code === 'WEAK_PASSWORD' ? t('fp_weakPassword') : t('fp_error'));
    } finally { setBusy(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <GeometricPattern className="pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="mb-4 flex justify-end"><LanguageSelector /></div>
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-text-primary">{t('fp_title')}</h1>
          <p className="mt-2 font-body text-text-secondary">{step === 'email' ? t('fp_subtitleEmail') : t('fp_subtitleReset')}</p>
        </div>
        <form onSubmit={step === 'email' ? requestCode : reset} noValidate className="card space-y-5">
          {error && <div role="alert" className="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">{error}</div>}
          {message && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
          {devCode && <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{t('fp_devCode', { code: devCode })}</p>}
          {step === 'email' ? (
            <FormField id="email" label={t('emailField')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          ) : (
            <>
              <FormField id="code" label={t('fp_code')} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" placeholder="123456" required />
              <FormField id="password" label={t('fp_newPassword')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
              <FormField id="confirmation" label={t('confirmPassword')} type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" required />
            </>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? '…' : step === 'email' ? t('fp_sendCode') : t('fp_reset')}</button>
          {step === 'reset' && <button type="button" onClick={() => { setStep('email'); setMessage(''); setDevCode(''); }} className="w-full text-center text-sm text-text-secondary hover:text-primary">{t('fp_resend')}</button>}
        </form>
        <p className="mt-6 text-center font-body text-sm text-text-secondary"><Link to="/login" className="font-medium text-primary hover:text-primary-hover">← {t('signIn')}</Link></p>
      </div>
    </div>
  );
}
