import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function AgenciesPage() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const reload = () => api.admin.listAgencies().then((data) => setAgencies(data.agences ?? []));

  useEffect(() => {
    reload()
      .catch(() => setAgencies([]))
      .finally(() => setLoading(false));
  }, [api]);

  return (
    <section className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Hajj operations</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('agencies')}</h1>
        <p className="mt-1 font-body text-text-secondary">{t('registeredAgencies')}</p>
      </header>
      <div className="card overflow-hidden !p-0">
        {loading ? <p className="p-6 text-text-secondary">{t('loading')}</p> : agencies.length === 0 ? (
          <p className="p-6 text-text-secondary">{t('noData')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-border bg-surface-muted"><tr><Th>Name</Th><Th>Encadreurs</Th><Th>Applications</Th><Th>Actions</Th></tr></thead>
            <tbody className="divide-y divide-border">
              {agencies.map((agency) => <tr key={agency.id}><td className="px-4 py-4 font-body font-medium text-text-primary">{agency.nom_agence}</td><td className="px-4 py-4 font-mono text-sm text-text-secondary">{agency.total_encadreurs}</td><td className="px-4 py-4 font-mono text-sm text-text-secondary">{agency.total_dossiers}</td><td className="px-4 py-4"><button disabled={deleting === agency.id} onClick={async () => { if (!window.confirm(`Delete ${agency.nom_agence}?`)) return; setDeleting(agency.id); try { await api.admin.deleteAgency(agency.id); await reload(); } finally { setDeleting(null); } }} className="text-sm font-semibold text-danger hover:underline">{deleting === agency.id ? 'Deleting...' : 'Delete'}</button></td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Th({ children }) { return <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</th>; }
