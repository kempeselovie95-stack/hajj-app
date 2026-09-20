import {
  DOSSIER_STATUS,
  DOSSIER_STATUS_LABELS,
  DOSSIER_STATUS_COLOR,
} from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useEffect, useState } from 'react';

const STATUS_ORDER = Object.values(DOSSIER_STATUS);

export default function AdminDashboardPage() {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  useEffect(() => { api.admin.stats().then((data) => setStats({ ...data.resume, statuts: data.statuts })).catch(() => setStats(null)); }, [api]);
  const summary = stats || { total_dossiers: 0, total_agences: 0, total_pelerins: 0, total_encadreurs: 0, dossiers_actifs: 0, statuts: [] };
  const statusCount = Object.fromEntries((summary.statuts || []).map((item) => [item.statut, item.total]));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Vue d'ensemble
        </h1>
        <p className="mt-1 font-body text-text-secondary">
          Suivi global des agences et des dossiers de pèlerinage.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Dossiers actifs" value={summary.dossiers_actifs} />
        <SummaryCard label="Agences enregistrées" value={summary.total_agences} />
        <SummaryCard label="Pèlerins inscrits" value={summary.total_pelerins} />
        <SummaryCard label="Encadreurs actifs" value={summary.total_encadreurs} />
      </div>

      <div className="card">
        <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">
          Répartition par statut
        </h2>
        <ul className="divide-y divide-border">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center justify-between py-3">
              <StatusBadge
                label={DOSSIER_STATUS_LABELS[status]}
                semantic={DOSSIER_STATUS_COLOR[status]}
              />
              <span className="font-mono text-sm text-text-secondary">{statusCount[status] || 0}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="card">
      <p className="font-body text-sm text-text-secondary">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}
