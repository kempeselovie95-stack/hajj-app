import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';
import { PageHeader, StatCard } from '../../components/common/ui.jsx';

const CATEGORIES = ['NEWS', 'GUIDANCE', 'HEALTH', 'TRAVEL', 'OTHER'];
const EMPTY = { id: null, titre: '', contenu: '', categorie: 'NEWS', statut: 'PUBLISHED', agence_id: '', media_url: null, media_type: 'NONE' };

/** Actualités : publication (texte, image ou vidéo) vue par les pèlerins sous forme de fil « réels » dans l'application mobile. */
export default function NewsPage() {
  const { api, user } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const { version } = useDataSync();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [media, setMedia] = useState(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const reload = useCallback(async () => {
    try { setItems(await api.news.list()); setError(''); } catch { setError(t('nw_loadError')); } finally { setLoading(false); }
  }, [api, t]);
  useEffect(() => { reload(); }, [reload, version]);
  useEffect(() => { if (isAdmin) api.admin.listAgencies().then((data) => setAgencies(data.agences ?? [])).catch(() => setAgencies([])); }, [api, isAdmin]);

  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const canManage = (item) => isAdmin || item.agence_id != null;

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setFormError('');
    try {
      const body = new FormData();
      for (const key of ['titre', 'contenu', 'categorie', 'statut']) body.append(key, form[key] ?? '');
      if (!form.id) body.append('agence_id', isAdmin ? form.agence_id || '' : '');
      if (media) body.append('media', media);
      if (removeMedia && !media) body.append('remove_media', '1');
      if (form.id) await api.news.update(form.id, body); else await api.news.create(body);
      setForm(null); await reload();
    } catch (requestError) { setFormError(requestError.message || t('nw_saveError')); } finally { setSaving(false); }
  }

  const act = async (action) => { setError(''); try { await action(); await reload(); } catch (requestError) { setError(requestError.message || t('nw_saveError')); } };
  const openForm = (item) => { setFormError(''); setMedia(null); setRemoveMedia(false); setForm(item ? { ...item, agence_id: item.agence_id ? String(item.agence_id) : '', contenu: item.contenu || '' } : { ...EMPTY }); };

  const totalLikes = items.reduce((sum, item) => sum + item.likes, 0);

  return (
    <section className="space-y-5 pb-8">
      <PageHeader kicker={t('nw_kicker')} title={t('nw_title')} description={t('nw_adminSubtitle')} actions={<button type="button" onClick={() => openForm(null)} className="btn-primary">{t('nw_new')}</button>} />
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('nw_title')} value={items.length} />
        <StatCard label={t('nws_PUBLISHED')} value={items.filter((item) => item.statut === 'PUBLISHED').length} tone="success" />
        <StatCard label={t('nw_like')} value={totalLikes} tone="info" />
      </div>

      {loading ? <p className="text-text-secondary">{t('loading')}</p> : items.length === 0 ? <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-secondary">{t('nw_none')}</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
              <div className="relative h-40 bg-gradient-to-br from-emerald-700 to-emerald-900">
                {item.media_type === 'IMAGE' && <img src={item.media_url} alt={item.titre} loading="lazy" className="h-full w-full object-cover" />}
                {item.media_type === 'VIDEO' && <video src={item.media_url} controls preload="metadata" className="h-full w-full object-cover" />}
                <span className={`absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${item.statut === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{t(`nws_${item.statut}`)}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t(`newscat_${item.categorie}`)}</p>
                <h3 className="font-display text-lg font-semibold text-text-primary">{item.titre}</h3>
                {item.contenu && <p className="line-clamp-3 text-sm text-text-secondary">{item.contenu}</p>}
                <p className="text-xs text-text-secondary">{item.auteur_nom} · {formatDateTime(item.cree_le)} · ♥ {item.likes} · {item.agence_id ? t('nw_myPilgrims') : t('nw_allAgencies')}</p>
                {canManage(item) && (
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                    <button type="button" onClick={() => openForm(item)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('c_edit')}</button>
                    <button type="button" onClick={() => act(() => api.news.update(item.id, { statut: item.statut === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED' }))} className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">{item.statut === 'PUBLISHED' ? t('nws_HIDDEN') : t('nws_PUBLISHED')}</button>
                    <button type="button" onClick={() => { if (window.confirm(t('res_confirmDelete'))) act(() => api.news.remove(item.id)); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">{t('c_delete')}</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}>
          <form onSubmit={submit} className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{form.id ? t('c_edit') : t('nw_new')}</h3>
            {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <label className="block text-xs font-medium text-slate-600">{t('nw_titleField')} *<input required maxLength={200} value={form.titre} onChange={(e) => set('titre', e.target.value)} className="field" /></label>
            <label className="block text-xs font-medium text-slate-600">{t('nw_content')}<textarea rows="4" maxLength={5000} value={form.contenu} onChange={(e) => set('contenu', e.target.value)} className="field" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">{t('nw_category')}<select value={form.categorie} onChange={(e) => set('categorie', e.target.value)} className="field">{CATEGORIES.map((value) => <option key={value} value={value}>{t(`newscat_${value}`)}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">{t('c_status')}<select value={form.statut} onChange={(e) => set('statut', e.target.value)} className="field">{['PUBLISHED', 'HIDDEN'].map((value) => <option key={value} value={value}>{t(`nws_${value}`)}</option>)}</select></label>
              {isAdmin && !form.id && <label className="block text-xs font-medium text-slate-600 sm:col-span-2">{t('nw_audience')}<select value={form.agence_id} onChange={(e) => set('agence_id', e.target.value)} className="field"><option value="">{t('nw_allAgencies')}</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.nom_agence ?? agency.name} #{agency.id}</option>)}</select></label>}
            </div>
            <div className="text-xs font-medium text-slate-600">{t('nw_media')}
              {form.media_url && !removeMedia && !media && <div className="mt-1.5 flex items-center gap-3">{form.media_type === 'IMAGE' ? <img src={form.media_url} alt="" className="h-14 w-24 rounded-md object-cover" /> : <span className="text-slate-700">🎞️ {form.media_type}</span>}<button type="button" onClick={() => setRemoveMedia(true)} className="text-red-700 underline">{t('nw_removeMedia')}</button></div>}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={(e) => { setMedia(e.target.files?.[0] ?? null); setRemoveMedia(false); }} className="field" />
              <span className="mt-1 block font-normal text-slate-500">{t('nw_mediaHint')}</span>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_saving') : t('c_save')}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
