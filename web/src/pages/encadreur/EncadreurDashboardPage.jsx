import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function EncadreurDashboardPage() {
  const { api, user } = useAuth();
  const { t } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.groups.list().then((data) => setGroups(data.groupes ?? [])).catch(() => setGroups([])).finally(() => setLoading(false));
  }, [api]);

  return (
    <section className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Guidance workspace</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('welcome')}, {user?.prenom}.</h1>
        <p className="mt-1 font-body text-text-secondary">Manage your pilgrim groups and keep them informed.</p>
      </header>
      <div className="card">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 className="font-display text-xl font-semibold text-text-primary">My groups</h2><span className="font-mono text-sm text-text-secondary">{groups.length}</span></div>
        {loading ? <p className="text-text-secondary">{t('loading')}</p> : groups.length === 0 ? <p className="text-text-secondary">No pilgrim group has been assigned yet.</p> : <div className="grid gap-3 md:grid-cols-2">{groups.map((group) => <Link key={group.id} to={`/encadreur/groupes/${group.id}/chat`} className="rounded-md border border-border p-4 transition-colors hover:border-primary hover:bg-primary-tint"><div className="flex items-center justify-between"><span className="font-body font-semibold text-text-primary">{group.nom}</span><span className="font-mono text-xs text-text-secondary">{group.total_membres} pilgrims</span></div><p className="mt-2 font-body text-sm text-text-secondary">{group.annee_hajj} · {group.nom_agence}</p><span className="mt-4 inline-block text-sm font-semibold text-primary">Open group chat →</span></Link>)}</div>}
      </div>
    </section>
  );
}
