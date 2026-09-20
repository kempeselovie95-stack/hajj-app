import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function PilgrimsPage() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dossiers.list({ page: 1, limite: 100 })
      .then((data) => setDossiers(data.dossiers ?? []))
      .catch(() => setDossiers([]))
      .finally(() => setLoading(false));
  }, [api]);

  const pilgrims = useMemo(() => [...new Map(dossiers.map((dossier) => [dossier.pelerin_nom, dossier])).values()], [dossiers]);

  return (
    <section className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Agency workspace</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('pilgrims')}</h1>
        <p className="mt-1 font-body text-text-secondary">{t('registeredPilgrims')}</p>
      </header>
      <div className="card overflow-hidden !p-0">
        {loading ? <p className="p-6 text-text-secondary">{t('loading')}</p> : pilgrims.length === 0 ? (
          <p className="p-6 text-text-secondary">{t('noData')}</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-border bg-surface-muted"><tr><Th>Name</Th><Th>Email</Th><Th>Application</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y divide-border">
              {pilgrims.map((dossier) => <tr key={dossier.id}><td className="px-4 py-4 font-body font-medium text-text-primary">{dossier.pelerin_nom}</td><td className="px-4 py-4 font-body text-sm text-text-secondary">{dossier.pelerin_email || '—'}</td><td className="px-4 py-4 font-mono text-sm text-text-secondary">{dossier.numero_dossier}</td><td className="px-4 py-4 font-body text-sm text-text-secondary">{dossier.statut}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function Th({ children }) { return <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</th>; }
