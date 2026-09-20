import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function PelerinDashboardPage() {
  const { user, api } = useAuth();
  const { t } = useLanguage();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dossiers.list({ page: 1, limite: 10 })
      .then((data) => setDossiers(data.dossiers || []))
      .catch(() => setDossiers([]))
      .finally(() => setLoading(false));
  }, [api]);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Hajj portal</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('welcome')}, {user?.prenom}.</h1>
        <p className="mt-2 text-text-secondary">{t('connected')}</p>
      </div>
      <div className="card">
        <h2 className="font-display text-xl font-semibold text-text-primary">{t('myApplications')}</h2>
        {loading ? <p className="mt-4 text-text-secondary">{t('loading')}</p> : dossiers.length === 0 ? (
          <p className="mt-4 text-text-secondary">{t('noApplications')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {dossiers.map((dossier) => (
              <div key={dossier.id} className="rounded-md border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-sm text-text-primary">{dossier.numero_dossier}</span>
                  <span className="text-sm text-text-secondary">{dossier.statut}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
