import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DOSSIER_STATUS,
  DOSSIER_STATUS_LABELS,
  DOSSIER_STATUS_COLOR,
  computeDocumentProgress,
  formatDate,
} from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

const STATUS_FILTER_OPTIONS = [{ value: 'all', label: 'Tous les statuts' }].concat(
  Object.values(DOSSIER_STATUS).map((status) => ({ value: status, label: DOSSIER_STATUS_LABELS[status] }))
);

export default function DossiersListPage() {
  const { api } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    api.dossiers.list({ page: 1, limite: 100 })
      .then((data) => {
        if (mounted) setDossiers((data.dossiers ?? []).map(normalizeDossier));
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message || 'Impossible de charger les dossiers.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [api]);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((dossier) => {
      const matchesStatus = statusFilter === 'all' || dossier.statut === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        dossier.numero_dossier.toLowerCase().includes(query) ||
        `${dossier.pelerin.prenom} ${dossier.pelerin.nom}`.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [dossiers, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Dossiers</h1>
        <p className="mt-1 font-body text-text-secondary">
          {filteredDossiers.length} dossier{filteredDossiers.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou numéro…"
          className="input-field sm:w-80"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-4 py-2.5 font-body text-sm text-text-primary focus:border-primary focus:outline-none"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden !p-0">
        {isLoading ? (
          <p className="p-6 text-center font-body text-sm text-text-secondary">Chargement des dossiers…</p>
        ) : error ? (
          <p className="p-6 text-center font-body text-sm text-danger">{error}</p>
        ) : filteredDossiers.length === 0 ? (
          <p className="p-6 text-center font-body text-sm text-text-secondary">
            Aucun dossier ne correspond à cette recherche.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <Th>Dossier</Th>
                <Th>Pèlerin</Th>
                <Th>Documents</Th>
                <Th>Statut</Th>
                <Th>Créé le</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDossiers.map((dossier) => {
                const progress = computeDocumentProgress(dossier.documents);
                return (
                  <tr key={dossier.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <Link
                        to={`/agence/dossiers/${dossier.id}`}
                        className="font-mono text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        {dossier.numero_dossier}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-text-primary">
                      {dossier.pelerin.prenom} {dossier.pelerin.nom}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32">
                        <ProgressBar percent={progress.percent} />
                      </div>
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function normalizeDossier(dossier) {
  return {
    ...dossier,
    created_at: dossier.created_at ?? dossier.cree_le,
    pelerin: dossier.pelerin ?? {
      nom: dossier.pelerin_nom?.split(' ').slice(1).join(' ') ?? '',
      prenom: dossier.pelerin_nom?.split(' ')[0] ?? '',
    },
    documents: dossier.documents ?? [],
  };
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 font-body text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </th>
  );
}
