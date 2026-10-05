import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';
import { PageHeader, StatCard, Section, EmptyState } from '../../components/common/ui.jsx';

/** Accueil du guide : mes groupes, mes cours à venir, mes incidents ouverts. Se met à jour tout seul. */
export default function EncadreurDashboardPage() {
  const { api, user } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const { version } = useDataSync();
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.groups.list().then((data) => data.groupes ?? []).catch(() => []),
      api.courses.list({ a_venir: 1 }).catch(() => []),
      api.operations.incidents.list().catch(() => []),
    ]).then(([groupList, courseList, incidentList]) => {
      if (!active) return;
      setGroups(groupList); setCourses(courseList); setIncidents(incidentList); loaded.current = true;
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, version]);

  if (loading && !loaded.current) return <p className="text-text-secondary">{t('loading')}</p>;

  const pilgrimCount = groups.reduce((sum, group) => sum + Number(group.total_membres || 0), 0);
  const upcoming = courses.filter((course) => course.statut === 'PUBLISHED');
  const openIncidents = incidents.filter((incident) => ['OPEN', 'IN_PROGRESS'].includes(incident.statut));

  return (
    <section className="space-y-6 pb-8">
      <PageHeader kicker={t('gd_kicker')} title={`${t('welcome')}, ${user?.prenom}.`} description={t('gd_subtitle')}
        actions={<Link to="/encadreur/cours" className="btn-primary">{t('co_new')}</Link>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('gd_myGroups')} value={groups.length} to="/encadreur/groupes" />
        <StatCard label={t('en_pilgrims')} value={pilgrimCount} to="/encadreur/presence" />
        <StatCard label={t('co_upcoming')} value={upcoming.length} tone="success" to="/encadreur/cours" />
        <StatCard label={t('gd_openIncidents')} value={openIncidents.length} tone={openIncidents.length ? 'danger' : 'neutral'} to="/encadreur/presence" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={t('gd_myGroups')} action={<Link to="/encadreur/presence" className="text-xs font-semibold text-primary hover:text-primary-hover">{t('presence')}</Link>}>
          {groups.length === 0 ? <EmptyState>{t('gd_noGroups')}</EmptyState> : (
            <div className="grid gap-3">{groups.map((group) => (
              <Link key={group.id} to={`/encadreur/groupes/${group.id}/chat`} className="rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-primary-tint">
                <div className="flex items-center justify-between"><span className="font-semibold text-text-primary">{group.nom}</span><span className="font-mono text-xs text-text-secondary">{t('gd_pilgrims', { count: Number(group.total_membres) || 0 })}</span></div>
                <p className="mt-1 text-sm text-text-secondary">{group.annee_hajj} · {group.nom_agence}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-primary">{t('gd_openChat')}</span>
              </Link>
            ))}</div>
          )}
        </Section>
        <div className="space-y-5">
          <Section title={t('co_upcoming')} action={<Link to="/encadreur/cours" className="text-xs font-semibold text-primary hover:text-primary-hover">{t('pd_seeAll')}</Link>}>
            {upcoming.length === 0 ? <EmptyState>{t('co_none')}</EmptyState> : (
              <ul className="space-y-2">{upcoming.slice(0, 4).map((course) => (
                <li key={course.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2.5 text-sm"><div><p className="font-medium text-text-primary">{course.titre}</p><p className="text-xs text-text-secondary">{formatDateTime(course.debut_le)}</p></div><span className="font-mono text-xs text-text-secondary">{t('co_participants', { count: course.inscrits })}</span></li>
              ))}</ul>
            )}
          </Section>
          <Section title={t('gd_openIncidents')} action={<Link to="/encadreur/presence" className="text-xs font-semibold text-primary hover:text-primary-hover">{t('pd_seeAll')}</Link>}>
            {openIncidents.length === 0 ? <EmptyState>{t('inc_none')}</EmptyState> : (
              <ul className="space-y-2">{openIncidents.slice(0, 4).map((incident) => (
                <li key={incident.id} className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-900"><p className="font-medium">{t(`inccat_${incident.categorie}`)} · {incident.groupe_nom}</p><p className="truncate text-xs">{incident.description}</p></li>
              ))}</ul>
            )}
          </Section>
        </div>
      </div>
    </section>
  );
}
