import {
  DOSSIER_STATUS,
  DOSSIER_STATUS_LABELS,
  DOSSIER_STATUS_COLOR,
} from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';

/**
 * TODO(intégration) : remplacer ces données par un appel
 * `api.dossiers.list()` + agrégation, une fois le backend resynchronisé.
 * La structure du rendu (cartes de synthèse + répartition par statut)
 * est volontairement déjà branchée sur les vraies constantes partagées.
 */
const MOCK_SUMMARY = {
  totalDossiers: 0,
  totalAgences: 0,
  totalPelerins: 0,
};

const STATUS_ORDER = Object.values(DOSSIER_STATUS);

export default function AdminDashboardPage() {
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
        <SummaryCard label="Dossiers actifs" value={MOCK_SUMMARY.totalDossiers} />
        <SummaryCard label="Agences enregistrées" value={MOCK_SUMMARY.totalAgences} />
        <SummaryCard label="Pèlerins inscrits" value={MOCK_SUMMARY.totalPelerins} />
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
              <span className="font-mono text-sm text-text-secondary">0</span>
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
