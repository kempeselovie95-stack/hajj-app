import { DOSSIER_STATUS, DOSSIER_STATUS_LABELS, DOSSIER_STATUS_COLOR } from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';

// TODO(intégration) : brancher sur api.dossiers.list({ agence_id: user.agence_id })
const MOCK_DOSSIERS_A_TRAITER = [];

export default function AgenceDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Vue d'ensemble
        </h1>
        <p className="mt-1 font-body text-text-secondary">
          Dossiers de tes pèlerins nécessitant une action.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">
          Dossiers à traiter
        </h2>

        {MOCK_DOSSIERS_A_TRAITER.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
            {MOCK_DOSSIERS_A_TRAITER.map((dossier) => (
              <li key={dossier.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm font-medium text-text-primary">
                    {dossier.numero_dossier}
                  </p>
                  <p className="font-mono text-xs text-text-secondary">{dossier.pelerin_nom}</p>
                </div>
                <StatusBadge
                  label={DOSSIER_STATUS_LABELS[dossier.statut]}
                  semantic={DOSSIER_STATUS_COLOR[dossier.statut]}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border py-10 text-center">
      <p className="font-body text-sm text-text-secondary">
        Aucun dossier en attente de traitement pour le moment.
      </p>
    </div>
  );
}
