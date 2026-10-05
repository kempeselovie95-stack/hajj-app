import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { PageHeader, StatCard, Section, EmptyState } from '../../components/common/ui.jsx';

const STATUS_TONE = { brouillon: 'neutral', soumis: 'info', en_verification: 'warning', valide: 'success', transmis_nusuk: 'info', confirme: 'success', rejete: 'danger', annule: 'neutral' };

/** Accueil pèlerin : où j'en suis, ce qu'il me reste à faire, mes prochains rendez-vous. Se met à jour tout seul. */
export default function PelerinDashboardPage() {
  const { user, api } = useAuth();
  const { t, formatCurrency, formatDateTime } = useLanguage();
  const { version } = useDataSync();
  const [summary, setSummary] = useState(null);
  const [trip, setTrip] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.pelerin.summary(), api.operations.myTrip().catch(() => null), api.courses.list({ a_venir: 1 }).catch(() => [])])
      .then(([summaryData, tripData, courseList]) => { if (active) { setSummary(summaryData); setTrip(tripData); setCourses(courseList); setError(''); loaded.current = true; } })
      .catch(() => { if (active) setError(t('md_loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, version, t]);

  if (loading && !loaded.current) return <p className="text-text-secondary">{t('loading')}</p>;

  const dossier = summary?.dossier;
  const required = summary?.types_requis ?? [];
  const docs = summary?.documents ?? [];
  const byType = Object.fromEntries(docs.map((doc) => [doc.type, doc]));
  const approved = required.filter((type) => byType[type]?.statut === 'APPROVED').length;
  const sent = required.filter((type) => byType[type]).length;
  const rejected = docs.filter((doc) => doc.statut === 'REJECTED').length;
  const balance = summary?.solde;
  const nextCourse = courses.find((course) => course.statut === 'PUBLISHED');
  const nextEvent = trip?.programme?.find((event) => event.debut_le >= new Date().toISOString().slice(0, 16));

  // Prochaines actions, de la plus urgente à la moins urgente.
  const steps = [];
  if (!dossier) steps.push({ key: 'noDossier', text: t('pd_stepNoDossier') });
  else {
    if (rejected) steps.push({ key: 'rejected', text: t('pd_stepRejected', { count: rejected }), to: '/pelerin/dossier', tone: 'danger' });
    if (sent < required.length) steps.push({ key: 'upload', text: t('pd_stepUpload', { count: required.length - sent }), to: '/pelerin/dossier', tone: 'warning' });
    if (['brouillon', 'rejete'].includes(dossier.statut) && sent === required.length && !rejected) steps.push({ key: 'submit', text: t('pd_stepSubmit'), to: '/pelerin/dossier', tone: 'info' });
    if (balance && balance.restant > 0) steps.push({ key: 'balance', text: t('pd_stepBalance', { amount: formatCurrency(balance.restant, balance.devise) }), to: '/pelerin/dossier' });
    if (!trip?.groupe) steps.push({ key: 'group', text: t('pd_stepGroup') });
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader kicker={t('pd_kicker')} title={`${t('welcome')}, ${user?.prenom}.`} description={t('pd_subtitle')}
        actions={dossier && <StatusBadge label={t(`status_${dossier.statut}`)} semantic={STATUS_TONE[dossier.statut]} />} />
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dossier')} value={dossier ? dossier.numero_dossier : '—'} hint={dossier ? [dossier.forfait, `Hajj ${dossier.annee_hajj}`].filter(Boolean).join(' · ') : t('md_noDossier')} to="/pelerin/dossier" />
        <StatCard label={t('md_documents')} value={`${approved}/${required.length}`} hint={t('pd_docsHint', { sent })} tone={rejected ? 'danger' : approved === required.length && required.length ? 'success' : 'neutral'} to="/pelerin/dossier" />
        <StatCard label={t('md_remaining')} value={balance ? formatCurrency(balance.restant, balance.devise) : '—'} hint={balance ? t('pd_paidHint', { amount: formatCurrency(balance.paye, balance.devise) }) : ''} tone={balance && balance.restant > 0 ? 'warning' : 'success'} to="/pelerin/dossier" />
        <StatCard label={t('pd_nextCourse')} value={nextCourse ? nextCourse.titre : '—'} hint={nextCourse ? formatDateTime(nextCourse.debut_le) : t('pd_noCourse')} to="/pelerin/cours" />
      </div>

      {dossier && required.length > 0 && <div className="card"><ProgressBar percent={Math.round((approved / required.length) * 100)} label={t('pd_progress')} /></div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t('pd_nextSteps')}>
          {steps.length === 0 ? <EmptyState>{t('pd_allDone')}</EmptyState> : (
            <ul className="space-y-2">{steps.map((step) => {
              const tone = { danger: 'border-red-200 bg-red-50 text-red-800', warning: 'border-amber-200 bg-amber-50 text-amber-900', info: 'border-sky-200 bg-sky-50 text-sky-900' }[step.tone] ?? 'border-border bg-surface-muted text-text-primary';
              const body = <span className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${tone}`}>{step.text}{step.to && <span aria-hidden="true">→</span>}</span>;
              return <li key={step.key}>{step.to ? <Link to={step.to}>{body}</Link> : body}</li>;
            })}</ul>
          )}
        </Section>

        <Section title={t('pd_upcoming')} action={<Link to="/pelerin/voyage" className="text-xs font-semibold text-primary hover:text-primary-hover">{t('pd_seeAll')}</Link>}>
          {!nextEvent && !courses.length ? <EmptyState>{t('pd_nothingPlanned')}</EmptyState> : (
            <ul className="space-y-2 text-sm">
              {nextEvent && <li className="rounded-lg bg-surface-muted px-3 py-2.5"><p className="font-medium text-text-primary">{nextEvent.titre}</p><p className="text-xs text-text-secondary">{formatDateTime(nextEvent.debut_le)}{nextEvent.lieu ? ` · ${nextEvent.lieu}` : ''}</p></li>}
              {courses.filter((course) => course.statut === 'PUBLISHED').slice(0, 3).map((course) => (
                <li key={course.id} className="rounded-lg bg-surface-muted px-3 py-2.5"><p className="font-medium text-text-primary">{course.titre}</p><p className="text-xs text-text-secondary">{t(`coursecat_${course.categorie}`)} · {formatDateTime(course.debut_le)}{course.inscrit ? ` · ${t('co_enrolled')}` : ''}</p></li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
