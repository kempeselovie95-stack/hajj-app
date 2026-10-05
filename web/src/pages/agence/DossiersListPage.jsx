import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DOSSIER_STATUS,
  DOSSIER_STATUS_COLOR,
  computeDocumentProgress,
} from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function DossiersListPage() {
  const { api, user } = useAuth();
  const base = user?.role === 'admin' ? '/admin' : '/agence';
  const { t, formatDate } = useLanguage();
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
        if (mounted) setError(requestError.message || t('dl_loadError'));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [api]);

  const statusOptions = [{ value: 'all', label: t('allStatus') }, ...Object.values(DOSSIER_STATUS).map((status) => ({ value: status, label: t(`status_${status}`) }))];

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
        <h1 className="font-display text-2xl font-semibold text-text-primary">{t('dl_title')}</h1>
        <p className="mt-1 font-body text-text-secondary">
          {t('dl_count', { count: filteredDossiers.length })}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchDossiers')}
          className="input-field sm:w-80"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-4 py-2.5 font-body text-sm text-text-primary focus:border-primary focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden !p-0">
        {isLoading ? (
          <p className="p-6 text-center font-body text-sm text-text-secondary">{t('dl_loading')}</p>
        ) : error ? (
          <p className="p-6 text-center font-body text-sm text-danger">{error}</p>
        ) : filteredDossiers.length === 0 ? (
          <p className="p-6 text-center font-body text-sm text-text-secondary">
            {t('dl_noMatch')}
          </p>
        ) : (
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <Th>{t('dossier')}</Th>
                <Th>{t('pilgrim')}</Th>
                <Th>{t('documents')}</Th>
                <Th>{t('status')}</Th>
                <Th>{t('createdAt')}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDossiers.map((dossier) => {
                const progress = computeDocumentProgress(dossier.documents);
                return (
                  <tr key={dossier.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <Link
                        to={`${base}/dossiers/${dossier.id}`}
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
                        label={t(`status_${dossier.statut}`)}
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
