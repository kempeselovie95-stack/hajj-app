import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  DOSSIER_STATUS_COLOR,
  DOCUMENT_STATUS,
  buildDocumentChecklist,
  computeDocumentProgress,
  canTransitionTo,
} from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Modal from '../../components/common/Modal.jsx';
import DocumentChecklistItem from '../../components/dossiers/DocumentChecklistItem.jsx';
import ValidationPanel from '../../components/dossiers/ValidationPanel.jsx';
import StatusHistoryTimeline from '../../components/dossiers/StatusHistoryTimeline.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function DossierDetailPage() {
  const { id } = useParams();
  const { user, api } = useAuth();
  const base = user?.role === 'admin' ? '/admin' : '/agence';
  const { version } = useDataSync();
  const [actionError, setActionError] = useState('');
  const { t, formatDate } = useLanguage();
  const [dossier, setDossier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState(null); // { type, label } | null
  const [rejectionReason, setRejectionReason] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    api.dossiers.getById(id)
      .then((data) => {
        if (mounted) setDossier(normalizeDossier(data.dossier));
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message || t('dd_notFound'));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [api, id, reloadKey, version]); // « version » : la fiche se relit toute seule (nom, téléphone, agence, pièces…)

  if (isLoading) {
    return <p className="font-body text-sm text-text-secondary">{t('dd_loading')}</p>;
  }

  if (error || !dossier) {
    return <Navigate to={`${base}/dossiers`} replace />;
  }

  const checklist = buildDocumentChecklist(dossier.documents);
  const progress = computeDocumentProgress(dossier.documents);

  async function updateDocumentStatus(type, statut, motif_rejet) {
    const document = dossier.documents.find((item) => item.type === type);
    if (!document?.id) return;
    if (statut === DOCUMENT_STATUS.VALIDE) await api.documents.validate(document.id);
    else await api.documents.reject(document.id, motif_rejet);
    setDossier((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) =>
        doc.type === type ? { ...doc, statut, ...(motif_rejet ? { motif_rejet } : {}) } : doc
      ),
    }));
  }

  async function handleValidate(type) {
    setActionError('');
    try { await updateDocumentStatus(type, DOCUMENT_STATUS.VALIDE); }
    catch (requestError) { setActionError(requestError.message || t('fp_error')); }
  }

  function openRejectModal(type, label) {
    setRejectionReason('');
    setRejectionTarget({ type, label });
  }

  async function confirmReject() {
    setActionError('');
    try { await updateDocumentStatus(rejectionTarget.type, DOCUMENT_STATUS.REJETE, rejectionReason); }
    catch (requestError) { setActionError(requestError.message || t('fp_error')); }
    setRejectionTarget(null);
  }

  async function handleStatusChange(nextStatus) {
    if (!canTransitionTo(dossier.statut, nextStatus)) return; // garde-fou silencieux, l'UI ne propose que le permis
    await api.dossiers.updateStatus(dossier.id, nextStatus);
    const historyEntry = {
      id: Date.now(),
      ancien_statut: dossier.statut,
      nouveau_statut: nextStatus,
      modifie_par_nom: t('dd_actorAgency', { name: user?.prenom ?? t('dd_you') }),
      created_at: new Date().toISOString(),
    };
    setDossier((prev) => ({
      ...prev,
      statut: nextStatus,
      historique: [...(prev.historique ?? []), historyEntry],
    }));
  }

  return (
    <div className="space-y-6">
      <Link to={`${base}/dossiers`} className="font-body text-sm text-text-secondary hover:text-primary">
        ← {t('returnToDossiers')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-text-secondary">{dossier.numero_dossier}</p>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            {dossier.pelerin.prenom} {dossier.pelerin.nom}
          </h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            {t('dd_createdOn', { date: formatDate(dossier.created_at, { dateStyle: 'long' }) })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge
            label={t(`status_${dossier.statut}`)}
            semantic={DOSSIER_STATUS_COLOR[dossier.statut]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-text-primary">{t('dd_documents')}</h2>
            <span className="font-mono text-sm text-text-secondary">
              {t('dd_approvedCount', { validated: progress.validated, total: progress.total })}
            </span>
          </div>
          <ProgressBar percent={progress.percent} />
          {actionError && <p role="alert" className="mt-3 rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{actionError}</p>}
          <div className="mt-4 divide-y divide-border">
            {checklist.map(({ type, document }) => (
              <DocumentChecklistItem
                key={type}
                label={t(`doctype_${type}`)}
                document={document}
                onValidate={() => handleValidate(type)}
                onReject={() => openRejectModal(type, t(`doctype_${type}`))}
              />
            ))}
          </div>
        </div>

        <div className="card h-fit space-y-3">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('pilgrim')}</h2>
          <InfoLine label={t('fullName')} value={`${dossier.pelerin.prenom} ${dossier.pelerin.nom}`} />
          <InfoLine label={t('phone')} value={dossier.pelerin.telephone} />
          <InfoLine label={t('agency')} value={dossier.agence.nom ?? t('dd_unassigned')} />
          <InfoLine label={t('emailField')} value={dossier.pelerin_email ?? '—'} />
          <InfoLine label={t('md_package')} value={dossier.forfait_nom ?? dossier.forfait ?? '—'} />
        </div>
      </div>

      <ValidationPanel dossierId={dossier.id} onChanged={() => setReloadKey((key) => key + 1)} />

      <div className="card">
        <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">
          {t('dossierHistory')}
        </h2>
        <StatusHistoryTimeline entries={dossier.historique ?? []} />
      </div>

      <Modal
        title={t('dd_rejectTitle', { label: rejectionTarget?.label ?? '' })}
        isOpen={!!rejectionTarget}
        onClose={() => setRejectionTarget(null)}
      >
        <label className="mb-1.5 block font-body text-sm font-medium text-text-primary">
          {t('rejectReason')}
        </label>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={3}
          placeholder={t('dd_rejectPlaceholder')}
          className="input-field resize-none"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setRejectionTarget(null)}
            className="rounded-md px-4 py-2 font-body text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            {t('cancel')}
          </button>
          <button
            onClick={confirmReject}
            disabled={!rejectionReason.trim()}
            className="rounded-md bg-danger px-4 py-2 font-body text-sm font-semibold text-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('rejectConfirm')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function normalizeDossier(dossier) {
  return {
    ...dossier,
    created_at: dossier.created_at ?? dossier.cree_le,
    pelerin: dossier.pelerin ?? {
      nom: dossier.nom ?? dossier.pelerin_nom?.split(' ').slice(1).join(' ') ?? '',
      prenom: dossier.prenom ?? dossier.pelerin_nom?.split(' ')[0] ?? '',
      telephone: dossier.telephone || '—',
    },
    agence: dossier.agence ?? { nom: dossier.nom_agence ?? null },
  };
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="font-body text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-body text-sm text-text-primary">{value}</p>
    </div>
  );
}
