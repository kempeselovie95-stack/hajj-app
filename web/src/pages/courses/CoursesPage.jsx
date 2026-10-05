import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';
import { PageHeader, StatCard } from '../../components/common/ui.jsx';

const CATEGORIES = ['RITUALS', 'HEALTH', 'LANGUAGE', 'LOGISTICS', 'OTHER'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'];
const STATUS_TONE = { DRAFT: 'bg-slate-100 text-slate-700', PUBLISHED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-red-50 text-red-700' };
const EMPTY = { id: null, contenu: '', titre: '', categorie: 'RITUALS', debut_le: '', duree_minutes: '60', lieu: '', lien_visio: '', support_url: '', groupe_id: '', agence_id: '', statut: 'PUBLISHED', description: '', nb_pages: '' };

/**
 * Cours : le guide, l'agence et l'administrateur les créent (titre, couverture, pages, support PDF).
 * Les pèlerins concernés sont notifiés à la publication, à la modification et à l'annulation.
 */
export default function CoursesPage() {
  const { api, user } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const { version } = useDataSync();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [cover, setCover] = useState(null);
  const [file, setFile] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);
  const [audio, setAudio] = useState(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [participants, setParticipants] = useState(null);

  const reload = useCallback(async () => {
    try { setItems(await api.courses.list()); setError(''); }
    catch { setError(t('co_loadError')); }
    finally { setLoading(false); }
  }, [api, t]);
  useEffect(() => { reload(); }, [reload, version]);
  useEffect(() => {
    api.groups.list().then((data) => setGroups(data.groupes ?? [])).catch(() => setGroups([]));
    if (isAdmin) api.admin.listAgencies().then((data) => setAgencies(data.agences ?? [])).catch(() => setAgencies([]));
  }, [api, isAdmin]);

  function openForm(course) {
    setFormError(''); setCover(null); setFile(null); setAudio(null); setRemoveCover(false); setRemoveFile(false); setRemoveAudio(false);
    setForm(course ? {
      id: course.id, titre: course.titre, categorie: course.categorie, debut_le: course.debut_le, duree_minutes: String(course.duree_minutes), lieu: course.lieu || '',
      lien_visio: course.lien_visio || '', support_url: course.support_url || '', groupe_id: course.groupe_id ? String(course.groupe_id) : '',
      agence_id: course.agence_id ? String(course.agence_id) : '', statut: course.statut === 'CANCELLED' ? 'PUBLISHED' : course.statut, description: course.description || '',
      nb_pages: course.nb_pages ? String(course.nb_pages) : '', cover_url: course.cover_url, fichier_nom: course.fichier_nom, audio_nom: course.audio_nom, contenu: '', contenuLoaded: false,
    } : { ...EMPTY });
    if (course?.a_contenu) api.courses.get(course.id).then((full) => setForm((current) => (current && current.id === course.id ? { ...current, contenu: full.contenu || '', contenuLoaded: true } : current))).catch(() => {});
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setFormError('');
    try {
      const body = new FormData();
      for (const key of ['titre', 'categorie', 'debut_le', 'duree_minutes', 'lieu', 'lien_visio', 'support_url', 'groupe_id', 'statut', 'description', 'nb_pages']) body.append(key, form[key] ?? '');
      if (isAdmin) body.append('agence_id', form.agence_id || '');
      if (!form.id || form.contenuLoaded || form.contenu) body.append('contenu', form.contenu);
      if (audio) body.append('audio', audio);
      if (removeAudio && !audio) body.append('remove_audio', '1');
      if (cover) body.append('cover', cover);
      if (file) body.append('file', file);
      if (removeCover && !cover) body.append('remove_cover', '1');
      if (removeFile && !file) body.append('remove_file', '1');
      if (form.id) await api.courses.update(form.id, body); else await api.courses.create(body);
      setForm(null); await reload();
    } catch (requestError) {
      const data = requestError.response?.data;
      setFormError(data?.message ? `${data.message}${data.erreurs?.length ? ` (${data.erreurs.map((e) => e.champ).join(', ')})` : ''}` : t('res_saveError'));
    } finally { setSaving(false); }
  }

  const act = async (action) => { setError(''); try { await action(); await reload(); } catch (requestError) { setError(requestError.message || t('res_saveError')); } };
  async function showParticipants(course) {
    try { setParticipants({ course, list: await api.courses.participants(course.id) }); } catch { setError(t('co_loadError')); }
  }

  const upcoming = items.filter((course) => course.statut === 'PUBLISHED' && course.debut_le >= new Date().toISOString().slice(0, 16));
  const enrolledTotal = items.reduce((sum, course) => sum + (course.statut === 'PUBLISHED' ? course.inscrits : 0), 0);
  const canManage = (course) => isAdmin || user?.role === 'agence' ? (isAdmin || course.agence_id != null) : Number(course.encadreur_id) === Number(user?.id);
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const visibleGroups = groups.filter((group) => !isAdmin || !form?.agence_id || String(group.agence_id) === String(form.agence_id));

  return (
    <section className="space-y-5 pb-8">
      <PageHeader kicker={t('co_kicker')} title={t('courses')} description={t('co_subtitleGuide')}
        actions={<button type="button" onClick={() => openForm(null)} className="btn-primary">{t('co_new')}</button>} />
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('co_total')} value={items.length} />
        <StatCard label={t('co_upcoming')} value={upcoming.length} tone="success" />
        <StatCard label={t('co_enrolledTotal')} value={enrolledTotal} tone="info" />
      </div>

      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('co_searchPlaceholder')} aria-label={t('co_searchPlaceholder')} className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" />
      {loading ? <p className="text-text-secondary">{t('loading')}</p> : items.length === 0 ? <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-text-secondary">{t('co_none')}</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.filter((course) => !search.trim() || course.titre.toLowerCase().includes(search.trim().toLowerCase())).map((course) => (
            <article key={course.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
              <div className="relative h-36 bg-gradient-to-br from-emerald-700 to-emerald-900">
                {course.cover_url && <img src={course.cover_url} alt={course.titre} loading="lazy" className="h-full w-full object-cover" />}
                <span className={`absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[course.statut]}`}>{t(`coursestatus_${course.statut}`)}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t(`coursecat_${course.categorie}`)}</p>
                <h3 className="font-display text-lg font-semibold text-text-primary">{course.titre}</h3>
                <p className="text-xs text-text-secondary">{formatDateTime(course.debut_le)} · {t('co_minutes', { count: course.duree_minutes })}</p>
                <p className="text-xs text-text-secondary">{course.nb_pages ? `${t('co_pages', { count: course.nb_pages })} · ` : ''}{course.groupe_nom || (course.agence_id ? t('co_allPilgrims') : t('co_allAgencies'))}{!canManage(course) || course.encadreur_nom ? ` · ${course.encadreur_nom}` : ''}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <button type="button" onClick={() => showParticipants(course)} className="font-mono text-emerald-800 underline">{t('co_enrolled')} : {course.inscrits}</button>
                  <span className="text-text-secondary">♥ {course.nb_favoris}</span>
                  {course.a_fichier && <button type="button" onClick={async () => { try { const link = await api.courses.downloadLink(course.id); window.open(link.url, '_blank'); } catch { setError(t('co_downloadError')); } }} className="font-semibold text-primary underline">⬇ {t('co_download')}</button>}
                </div>
                {canManage(course) && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <button type="button" onClick={() => openForm(course)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('c_edit')}</button>
                    {course.statut === 'PUBLISHED' && <button type="button" onClick={() => act(() => api.courses.update(course.id, { statut: 'CANCELLED' }))} className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">{t('co_cancel')}</button>}
                    {course.statut === 'DRAFT' && <button type="button" onClick={() => act(() => api.courses.update(course.id, { statut: 'PUBLISHED' }))} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">{t('co_publish')}</button>}
                    <button type="button" onClick={() => { if (window.confirm(t('res_confirmDelete'))) act(() => api.courses.remove(course.id)); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">{t('c_delete')}</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}>
          <form onSubmit={submit} className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{form.id ? t('c_edit') : t('co_new')}</h3>
            {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">{t('co_title')} *<input required maxLength={200} value={form.titre} onChange={(e) => set('titre', e.target.value)} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('co_category')}<select value={form.categorie} onChange={(e) => set('categorie', e.target.value)} className="field">{CATEGORIES.map((value) => <option key={value} value={value}>{t(`coursecat_${value}`)}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">{t('pg2_when')} *<input required type="datetime-local" value={form.debut_le} onChange={(e) => set('debut_le', e.target.value)} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('co_duration')}<input type="number" min="5" max="600" value={form.duree_minutes} onChange={(e) => set('duree_minutes', e.target.value)} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('co_pagesField')}<input type="number" min="1" max="5000" value={form.nb_pages} onChange={(e) => set('nb_pages', e.target.value)} placeholder={t('co_pagesAuto')} className="field" /></label>
              {isAdmin && <label className="block text-xs font-medium text-slate-600">{t('trip_agency')}<select value={form.agence_id} onChange={(e) => { set('agence_id', e.target.value); set('groupe_id', ''); }} className="field"><option value="">{t('co_allAgencies')}</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.nom_agence ?? agency.name} #{agency.id}</option>)}</select></label>}
              <label className="block text-xs font-medium text-slate-600">{t('co_audience')}<select value={form.groupe_id} onChange={(e) => set('groupe_id', e.target.value)} className="field"><option value="">{form.agence_id || !isAdmin ? t('co_allPilgrims') : t('co_allAgencies')}</option>{visibleGroups.map((group) => <option key={group.id} value={group.id}>{group.nom}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">{t('pg2_place')}<input maxLength={200} value={form.lieu} onChange={(e) => set('lieu', e.target.value)} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('co_link')}<input type="url" maxLength={500} value={form.lien_visio} onChange={(e) => set('lien_visio', e.target.value)} className="field" /></label>
              <label className="block text-xs font-medium text-slate-600">{t('c_status')}<select value={form.statut} onChange={(e) => set('statut', e.target.value)} className="field">{['PUBLISHED', 'DRAFT'].map((value) => <option key={value} value={value}>{t(`coursestatus_${value}`)}</option>)}</select></label>
              <div className="text-xs font-medium text-slate-600">{t('co_cover')}
                {form.cover_url && !removeCover && !cover && <div className="mt-1.5 flex items-center gap-3"><img src={form.cover_url} alt="" className="h-14 w-24 rounded-md object-cover" /><button type="button" onClick={() => setRemoveCover(true)} className="text-red-700 underline">{t('co_removeCover')}</button></div>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setCover(e.target.files?.[0] ?? null); setRemoveCover(false); }} className="field" />
              </div>
              <div className="text-xs font-medium text-slate-600">{t('co_file')}
                {form.fichier_nom && !removeFile && !file && <div className="mt-1.5 flex items-center gap-3"><span className="truncate text-slate-700">{form.fichier_nom}</span><button type="button" onClick={() => setRemoveFile(true)} className="text-red-700 underline">{t('co_removeFile')}</button></div>}
                <input type="file" accept="application/pdf" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveFile(false); }} className="field" />
                <span className="mt-1 block font-normal text-slate-500">{t('co_fileHint')}</span>
              </div>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">{t('co_content')}<textarea rows="6" maxLength={60000} value={form.contenu} onChange={(e) => set('contenu', e.target.value)} className="field" /><span className="mt-1 block font-normal text-slate-500">{t('co_contentHint')}</span></label>
              <div className="text-xs font-medium text-slate-600 sm:col-span-2">{t('co_audio')}
                {form.audio_nom && !removeAudio && !audio && <div className="mt-1.5 flex items-center gap-3"><span className="truncate text-slate-700">{form.audio_nom}</span><button type="button" onClick={() => setRemoveAudio(true)} className="text-red-700 underline">{t('co_removeAudio')}</button></div>}
                <input type="file" accept="audio/*" onChange={(e) => { setAudio(e.target.files?.[0] ?? null); setRemoveAudio(false); }} className="field" />
              </div>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">{t('op_description')}<textarea rows="3" maxLength={4000} value={form.description} onChange={(e) => set('description', e.target.value)} className="field" /></label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_saving') : t('c_save')}</button>
            </div>
          </form>
        </div>
      )}

      {participants && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setParticipants(null); }}>
          <div className="w-full space-y-3 rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{participants.course.titre}</h3>
            {participants.list.length === 0 ? <p className="text-sm text-slate-500">{t('co_noParticipants')}</p> : <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">{participants.list.map((person) => <li key={person.id} className="flex justify-between py-2 text-sm"><span className="font-medium text-slate-800">{person.prenom} {person.nom}</span><span className="text-slate-500">{person.telephone}</span></li>)}</ul>}
            <div className="text-end"><button type="button" onClick={() => setParticipants(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('c_close')}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
