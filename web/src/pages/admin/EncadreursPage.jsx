import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const EMPTY_FORM = { prenom: '', nom: '', email: '', telephone: '', mot_de_passe: '', agence_id: '' };

/**
 * Guides (encadreurs). Admin plateforme : tous, avec choix de l'agence.
 * Agence : uniquement ses guides — l'agence est déduite du compte côté serveur.
 */
export default function EncadreursPage() {
  const { api, user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const [guides, setGuides] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = isAdmin ? await api.admin.listEncadreurs() : await api.agency.listGuides();
      setGuides(data.encadreurs ?? []);
      setError('');
    } catch { setGuides([]); setError(t('en_loadError')); }
    finally { setLoading(false); }
  }, [api, isAdmin, t]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (isAdmin) api.admin.listAgencies().then((data) => setAgencies(data.agences ?? [])).catch(() => setAgencies([])); }, [api, isAdmin]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { prenom: form.prenom, nom: form.nom, email: form.email, telephone: form.telephone || undefined, mot_de_passe: form.mot_de_passe };
      if (isAdmin) await api.admin.createEncadreur({ ...payload, agence_id: Number(form.agence_id) });
      else await api.agency.createGuide(payload);
      setDialog(false); setForm(EMPTY_FORM); setNotice(t('en_created')); await reload();
    } catch (requestError) {
      setError(requestError.response?.status === 409 ? t('duplicateEmail') : t('en_createError'));
    } finally { setSaving(false); }
  }

  async function remove(guide) {
    if (!window.confirm(t('c_confirmDelete', { name: `${guide.prenom} ${guide.nom}` }))) return;
    try { await (isAdmin ? api.admin.deleteEncadreur(guide.id) : api.agency.deleteGuide(guide.id)); setNotice(''); await reload(); }
    catch { setError(t('en_deleteError')); }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{t('en_kicker')}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('encadreurs')}</h1>
          <p className="mt-1 text-text-secondary">{t('en_subtitle')}</p>
        </div>
        <button type="button" onClick={() => { setError(''); setNotice(''); setForm({ ...EMPTY_FORM, agence_id: agencies[0] ? String(agencies[0].id) : '' }); setDialog(true); }} className="btn-primary">{t('en_new')}</button>
      </header>
      {error && !dialog && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      <div className="card overflow-hidden !p-0">
        {loading ? <p className="p-6 text-text-secondary">{t('loading')}</p> : guides.length === 0 ? <p className="p-6 text-text-secondary">{t('en_none')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start">
              <thead className="border-b border-border bg-surface-muted"><tr><Th>{t('c_name')}</Th><Th>{t('emailField')}</Th>{isAdmin && <Th>{t('en_agency')}</Th>}<Th>{t('en_groups')}</Th><Th>{t('en_pilgrims')}</Th><Th>{t('c_actions')}</Th></tr></thead>
              <tbody className="divide-y divide-border">{guides.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-text-primary">{item.prenom} {item.nom}<span className="block text-xs font-normal text-text-secondary">{item.telephone || ''}</span></td>
                  <td className="px-4 py-4 text-sm text-text-secondary">{item.email}</td>
                  {isAdmin && <td className="px-4 py-4 text-sm text-text-secondary">{item.nom_agence}</td>}
                  <td className="px-4 py-4 font-mono text-sm text-text-secondary">{item.total_groupes}</td>
                  <td className="px-4 py-4 font-mono text-sm text-text-secondary">{item.total_pelerins}</td>
                  <td className="px-4 py-4"><button type="button" onClick={() => remove(item)} className="text-sm font-semibold text-danger hover:underline">{t('c_delete')}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(false); }}>
          <form onSubmit={submit} className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <h2 className="text-lg font-semibold text-slate-900">{t('en_new')}</h2>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">{t('firstName')}<input required maxLength={100} value={form.prenom} onChange={(e) => setForm((c) => ({ ...c, prenom: e.target.value }))} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('lastName')}<input required maxLength={100} value={form.nom} onChange={(e) => setForm((c) => ({ ...c, nom: e.target.value }))} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('emailField')}<input required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('phone')}<input type="tel" maxLength={20} value={form.telephone} onChange={(e) => setForm((c) => ({ ...c, telephone: e.target.value }))} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('pg_fTempPassword')}<input required type="password" minLength={8} autoComplete="new-password" value={form.mot_de_passe} onChange={(e) => setForm((c) => ({ ...c, mot_de_passe: e.target.value }))} className="field" /></label>
              {isAdmin && <label className="block text-xs font-medium text-slate-600">{t('en_agency')}<select required value={form.agence_id} onChange={(e) => setForm((c) => ({ ...c, agence_id: e.target.value }))} className="field">{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.nom_agence ?? agency.name} #{agency.id}</option>)}</select></label>}
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setDialog(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_creating') : t('c_create')}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

function Th({ children }) { return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</th>; }
