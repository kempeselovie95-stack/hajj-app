import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { PageHeader } from '../../components/common/ui.jsx';

const TABS = ['profile', 'security', 'preferences'];
const ROLE_KEYS = { admin: 'roleAdmin', agence: 'roleAgency', encadreur: 'roleGuide', pelerin: 'rolePilgrim' };
const PASSWORD_RULES = [
  { key: 'length', test: (value) => value.length >= 8 },
  { key: 'upper', test: (value) => /[A-Z]/.test(value) },
  { key: 'digit', test: (value) => /[0-9]/.test(value) },
];

/** Paramètres du compte : profil, sécurité et préférences — disponible pour tous les rôles. */
export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { t, language, languages, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [tab, setTab] = useState('profile');
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader kicker={t('account')} title={t('settings')} description={t('set_subtitle')} />

      <div className="card flex flex-wrap items-center gap-4 !p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-[#FAF7F0]">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-semibold text-text-primary">{user?.prenom} {user?.nom}</p>
          <p className="truncate text-sm text-text-secondary">{user?.email}</p>
        </div>
        <span className="rounded-full bg-primary-tint px-3 py-1 text-xs font-semibold text-primary">{t(ROLE_KEYS[user?.role] ?? 'rolePilgrim')}</span>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav role="tablist" aria-orientation="vertical" className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {TABS.map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-start text-sm font-medium transition ${tab === name ? 'bg-primary text-[#FAF7F0] shadow-card' : 'bg-surface text-text-secondary ring-1 ring-border hover:text-text-primary'}`}>
              {t(`set_tab_${name}`)}
            </button>
          ))}
          <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="whitespace-nowrap rounded-lg px-4 py-2.5 text-start text-sm font-medium text-danger ring-1 ring-red-200 hover:bg-danger-tint md:mt-4">{t('logout')}</button>
        </nav>

        <div role="tabpanel">
          {tab === 'profile' && <ProfileForm user={user} updateProfile={updateProfile} t={t} />}
          {tab === 'security' && <SecurityForm updateProfile={updateProfile} t={t} />}
          {tab === 'preferences' && (
            <div className="card space-y-5">
              <div><h2 className="font-display text-lg font-semibold text-text-primary">{t('language')}</h2><p className="mt-1 text-sm text-text-secondary">{t('set_languageHint')}</p></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {languages.map((item) => (
                  <button key={item.code} type="button" onClick={() => setLanguage(item.code)} aria-pressed={language === item.code}
                    className={`rounded-xl border p-4 text-start transition ${language === item.code ? 'border-primary bg-primary-tint ring-2 ring-primary/30' : 'border-border hover:border-primary'}`}>
                    <span className="block text-base font-semibold text-text-primary">{item.label}</span>
                    <span className="mt-0.5 block font-mono text-xs text-text-secondary">{item.shortLabel}</span>
                  </button>
                ))}
              </div>
              <div><h2 className="font-display text-lg font-semibold text-text-primary">{t('theme_title')}</h2><p className="mt-1 text-sm text-text-secondary">{t('theme_hint')}</p></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[['light', '☀️'], ['dark', '🌙'], ['system', '🖥️']].map(([value, icon]) => (
                  <button key={value} type="button" onClick={() => setThemePreference(value)} aria-pressed={themePreference === value}
                    className={`rounded-xl border p-4 text-start transition ${themePreference === value ? 'border-primary bg-primary-tint ring-2 ring-primary/30' : 'border-border hover:border-primary'}`}>
                    <span className="block text-2xl">{icon}</span>
                    <span className="mt-1 block text-base font-semibold text-text-primary">{t(`theme_${value}`)}</span>
                  </button>
                ))}
              </div>
              <p className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-text-secondary">{t('set_liveHint')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Feedback({ state }) {
  return (
    <>
      {state.message && <p role="status" className="rounded-md bg-success-tint p-3 text-sm text-success">{state.message}</p>}
      {state.error && <p role="alert" className="rounded-md bg-danger-tint p-3 text-sm text-danger">{state.error}</p>}
    </>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <label className="block text-sm font-medium text-text-primary">{label}
      <input className="input-field mt-1.5" {...props} />
      {hint && <span className="mt-1 block text-xs font-normal text-text-secondary">{hint}</span>}
    </label>
  );
}

function ProfileForm({ user, updateProfile, t }) {
  const [form, setForm] = useState({ prenom: user?.prenom || '', nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, message: '', error: '' });
    try { await updateProfile(form); setState({ loading: false, message: t('profileUpdated'), error: '' }); }
    catch (error) { setState({ loading: false, message: '', error: error.status === 409 ? t('duplicateEmail') : t('profileUpdateFailed') }); }
  }
  return (
    <form onSubmit={submit} className="card space-y-5">
      <div><h2 className="font-display text-lg font-semibold text-text-primary">{t('set_tab_profile')}</h2><p className="mt-1 text-sm text-text-secondary">{t('manageAccount')}</p></div>
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('firstName')} name="prenom" required value={form.prenom} onChange={change} autoComplete="given-name" />
        <Field label={t('lastName')} name="nom" required value={form.nom} onChange={change} autoComplete="family-name" />
      </div>
      <Field label={t('emailField')} name="email" type="email" required value={form.email} onChange={change} autoComplete="email" />
      <Field label={t('phone')} name="telephone" type="tel" maxLength={20} value={form.telephone} onChange={change} autoComplete="tel" />
      <div className="flex justify-end"><button className="btn-primary" disabled={state.loading}>{state.loading ? t('saving') : t('saveChanges')}</button></div>
    </form>
  );
}

function SecurityForm({ updateProfile, t }) {
  const [form, setForm] = useState({ ancien_mot_de_passe: '', mot_de_passe: '', confirmation: '' });
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const rulesOk = PASSWORD_RULES.every((rule) => rule.test(form.mot_de_passe));
  const matches = form.mot_de_passe !== '' && form.mot_de_passe === form.confirmation;
  async function submit(event) {
    event.preventDefault();
    if (!rulesOk || !matches) return;
    setState({ loading: true, message: '', error: '' });
    try {
      await updateProfile({ ancien_mot_de_passe: form.ancien_mot_de_passe, mot_de_passe: form.mot_de_passe });
      setForm({ ancien_mot_de_passe: '', mot_de_passe: '', confirmation: '' });
      setState({ loading: false, message: t('set_passwordChanged'), error: '' });
    } catch (error) { setState({ loading: false, message: '', error: error.status === 400 ? t('set_wrongPassword') : t('profileUpdateFailed') }); }
  }
  return (
    <form onSubmit={submit} className="card space-y-5">
      <div><h2 className="font-display text-lg font-semibold text-text-primary">{t('changePassword')}</h2><p className="mt-1 text-sm text-text-secondary">{t('set_securityHint')}</p></div>
      <Feedback state={state} />
      <Field label={t('currentPassword')} name="ancien_mot_de_passe" type="password" required value={form.ancien_mot_de_passe} onChange={change} autoComplete="current-password" />
      <Field label={t('newPassword')} name="mot_de_passe" type="password" required value={form.mot_de_passe} onChange={change} autoComplete="new-password" />
      <ul className="grid gap-1.5 text-xs sm:grid-cols-3">
        {PASSWORD_RULES.map((rule) => <li key={rule.key} className={rule.test(form.mot_de_passe) ? 'text-success' : 'text-text-secondary'}>{rule.test(form.mot_de_passe) ? '✓' : '○'} {t(`set_rule_${rule.key}`)}</li>)}
      </ul>
      <Field label={t('confirmPassword')} name="confirmation" type="password" required value={form.confirmation} onChange={change} autoComplete="new-password" hint={form.confirmation && !matches ? t('reg_confirmMismatch') : undefined} />
      <div className="flex justify-end"><button className="btn-primary" disabled={state.loading || !rulesOk || !matches || !form.ancien_mot_de_passe}>{state.loading ? t('saving') : t('changePassword')}</button></div>
    </form>
  );
}
