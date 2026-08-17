import { useState, useMemo } from 'react';
import { DOSSIER_STATUS_LABELS, DOSSIER_STATUS_COLOR, formatDate } from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { MOCK_DOSSIERS } from '../../mocks/mockDossiers.js';

// TODO(intégration) : liste des agences dérivée de api.agences.list() une fois disponible
const AGENCE_FILTER_OPTIONS = [{ value: 'all', label: 'Toutes les agences' }].concat(
  [...new Map(MOCK_DOSSIERS.map((d) => [d.agence.id, d.agence])).values()].map((agence) => ({
    value: String(agence.id),
    label: agence.nom,
  }))
);

export default function AdminDossiersListPage() {
  // TODO(intégration) : remplacer par api.dossiers.list() (sans filtre agence_id, admin voit tout)
  const [agenceFilter, setAgenceFilter] = useState('all');

  const filteredDossiers = useMemo(
    () =>
      MOCK_DOSSIERS.filter(
        (d) => agenceFilter === 'all' || String(d.agence.id) === agenceFilter
      ),
    [agenceFilter]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Dossiers — toutes agences
        </h1>
        <p className="mt-1 font-body text-text-secondary">
          Vue globale en lecture seule. La gestion (validation, statut) se fait côté agence.
        </p>
      </div>

      <select
        value={agenceFilter}
        onChange={(e) => setAgenceFilter(e.target.value)}
        className="rounded-md border border-border bg-surface px-4 py-2.5 font-body text-sm text-text-primary focus:border-primary focus:outline-none"
      >
        {AGENCE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <Th>Dossier</Th>
              <Th>Pèlerin</Th>
              <Th>Agence</Th>
              <Th>Statut</Th>
              <Th>Créé le</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredDossiers.map((dossier) => (
              <tr key={dossier.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-mono text-sm text-text-primary">
                  {dossier.numero_dossier}
                </td>
                <td className="px-4 py-3 font-body text-sm text-text-primary">
                  {dossier.pelerin.prenom} {dossier.pelerin.nom}
                </td>
                <td className="px-4 py-3 font-body text-sm text-text-secondary">
                  {dossier.agence.nom}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={DOSSIER_STATUS_LABELS[dossier.statut]}
                    semantic={DOSSIER_STATUS_COLOR[dossier.statut]}
                  />
                </td>
                <td className="px-4 py-3 font-body text-sm text-text-secondary">
                  {formatDate(dossier.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </th>
  );
}
