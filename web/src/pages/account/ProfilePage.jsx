import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ nom: user?.nom || '', prenom: user?.prenom || '', email: user?.email || '', telephone: user?.telephone || '', ancien_mot_de_passe: '', mot_de_passe: '' });
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setState({ loading: true, message: '', error: '' });
    try { await updateProfile(form); setState({ loading: false, message: 'Profile updated successfully.', error: '' }); }
    catch (error) { setState({ loading: false, message: '', error: error.message || 'Unable to update profile.' }); }
  }
  return <section className="mx-auto max-w-2xl space-y-6"><header><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Account</p><h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('profile')}</h1><p className="mt-1 text-text-secondary">Manage your personal information and password.</p></header><form onSubmit={submit} className="card space-y-5">{state.message && <p className="rounded-md bg-success-tint p-3 text-sm text-success">{state.message}</p>}{state.error && <p className="rounded-md bg-danger-tint p-3 text-sm text-danger">{state.error}</p>}<div className="grid gap-5 sm:grid-cols-2"><Field name="prenom" label="First name" value={form.prenom} onChange={update} /><Field name="nom" label="Last name" value={form.nom} onChange={update} /></div><Field name="email" label="Email" type="email" value={form.email} onChange={update} /><Field name="telephone" label="Phone" value={form.telephone} onChange={update} /><div className="border-t border-border pt-5"><p className="mb-3 font-body text-sm font-semibold text-text-primary">Change password</p><div className="space-y-4"><Field name="ancien_mot_de_passe" label="Current password" type="password" value={form.ancien_mot_de_passe} onChange={update} /><Field name="mot_de_passe" label="New password" type="password" value={form.mot_de_passe} onChange={update} /></div></div><button className="btn-primary" disabled={state.loading}>{state.loading ? 'Saving...' : 'Save changes'}</button></form></section>;
}
function Field({ name, label, value, onChange, type = 'text' }) { return <label className="block font-body text-sm font-medium text-text-primary">{label}<input className="input-field mt-1.5" name={name} type={type} value={value} onChange={onChange} /></label>; }
