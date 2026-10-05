import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';
import { PageHeader, EmptyState } from '../../components/common/ui.jsx';

/** Cours proposés par mon guide, mon agence ou l'administration : consulter, s'inscrire, mettre en favoris, télécharger. */
export default function MyCoursesPage() {
  const { api } = useAuth();
  const { t, formatDate } = useLanguage();
  const { version } = useDataSync();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(async () => {
    try { setItems(await api.courses.list()); setError(''); }
    catch { setError(t('co_loadError')); }
    finally { setLoading(false); }
  }, [api, t]);
  useEffect(() => { reload(); }, [reload, version]);

  const run = async (course, action, failureKey) => {
    setBusyId(course.id); setError('');
    try { await action(); await reload(); } catch { setError(t(failureKey)); } finally { setBusyId(null); }
  };

  const now = new Date().toISOString().slice(0, 16);
  const shown = items.filter((course) => (tab === 'favorites' ? course.favori : true) && (!search.trim() || course.titre.toLowerCase().includes(search.trim().toLowerCase())));
  const upcoming = shown.filter((course) => course.debut_le >= now);
  const past = shown.filter((course) => course.debut_le < now && course.statut === 'PUBLISHED');

  const Card = ({ course, isPast }) => {
    const cancelled = course.statut === 'CANCELLED';
    return (
      <article className={`flex flex-col overflow-hidden rounded-xl border border-border bg-surface ${cancelled ? 'opacity-70' : ''}`}>
        <div className="relative h-40 bg-gradient-to-br from-emerald-700 to-emerald-900">
          {course.cover_url && <img src={course.cover_url} alt={course.titre} loading="lazy" className="h-full w-full object-cover" />}
          <button type="button" aria-pressed={course.favori} aria-label={course.favori ? t('co_unfavorite') : t('co_favorite')} disabled={busyId === course.id}
            onClick={() => run(course, () => (course.favori ? api.courses.unfavorite(course.id) : api.courses.favorite(course.id)), 'co_favError')}
            className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow">{course.favori ? '❤️' : '🤍'}</button>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t(`coursecat_${course.categorie}`)}</p>
          <h3 className="font-display text-lg font-semibold text-text-primary">{course.titre}</h3>
          <p className="text-xs text-text-secondary">{t('co_by', { name: course.encadreur_nom })}{course.nb_pages ? ` · ${t('co_pages', { count: course.nb_pages })}` : ''} · {formatDate(course.debut_le, { dateStyle: 'medium', timeStyle: 'short' })} · {t('co_minutes', { count: course.duree_minutes })}</p>
          {course.description && <p className="whitespace-pre-wrap text-sm text-text-secondary">{course.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
            {course.lieu && <span>📍 {course.lieu}</span>}
            {course.lien_visio && <a href={course.lien_visio} target="_blank" rel="noreferrer noopener" className="font-semibold text-primary underline">{t('co_join')}</a>}
            <span>{t('co_participants', { count: course.inscrits })}</span>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {course.inscrit && course.a_fichier && <button type="button" disabled={busyId === course.id} onClick={() => run(course, async () => { const link = await api.courses.downloadLink(course.id); window.open(link.url, '_blank'); }, 'co_downloadError')} className="rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-tint">⬇ {t('co_download')}</button>}
            {cancelled ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{t('coursestatus_CANCELLED')}</p>
              : <button type="button" disabled={busyId === course.id} onClick={() => run(course, () => (course.inscrit ? api.courses.unenroll(course.id) : api.courses.enroll(course.id)), 'co_enrollError')} className={course.inscrit ? 'rounded-md border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-muted' : 'btn-primary'}>{course.inscrit ? t('co_unenroll') : t('co_enroll')}</button>}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-6 pb-8">
      <PageHeader kicker={t('co_kicker')} title={t('courses')} description={t('co_subtitlePilgrim')} />
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('co_searchPlaceholder')} aria-label={t('co_searchPlaceholder')} className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" />
      <div role="tablist" className="flex gap-2">
        {['all', 'favorites'].map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === name ? 'bg-primary text-[#FAF7F0]' : 'bg-surface-muted text-text-secondary hover:text-text-primary'}`}>{t(name === 'all' ? 'co_tabAll' : 'co_tabFavorites')}</button>)}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-text-secondary">{t('loading')}</p> : (
        <>
          {upcoming.length === 0 ? <EmptyState>{tab === 'favorites' ? t('co_noFavorites') : t('co_nonePilgrim')}</EmptyState> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{upcoming.map((course) => <Card key={course.id} course={course} />)}</div>}
          {past.length > 0 && <div className="space-y-3"><h2 className="font-display text-lg font-semibold text-text-primary">{t('co_past')}</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{past.map((course) => <Card key={course.id} course={course} isPast />)}</div></div>}
        </>
      )}
    </section>
  );
}
