import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  DOSSIER_STATUS_LABELS,
  DOSSIER_STATUS_COLOR,
  DOCUMENT_STATUS,
  buildDocumentChecklist,
  computeDocumentProgress,
  formatDate,
  canTransitionTo,
} from '@hajj/shared';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import Modal from '../../components/common/Modal.jsx';
import DocumentChecklistItem from '../../components/dossiers/DocumentChecklistItem.jsx';
import DossierStatusSelect from '../../components/dossiers/DossierStatusSelect.jsx';
import StatusHistoryTimeline from '../../components/dossiers/StatusHistoryTimeline.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function DossierDetailPage() {
  const { id } = useParams();
  const { user, api } = useAuth();
  const [dossier, setDossier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState(null); // { type, label } | null
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    let mounted = true;
    api.dossiers.getById(id)
      .then((data) => {
        if (mounted) setDossier(normalizeDossier(data.dossier));
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message || 'Dossier introuvable.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [api, id]);

  if (isLoading) {
    return <p className="font-body text-sm text-text-secondary">Chargement du dossier…</p>;
  }

  if (error || !dossier) {
    return <Navigate to="/agence/dossiers" replace />;
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
    await updateDocumentStatus(type, DOCUMENT_STATUS.VALIDE);
  }

  function openRejectModal(type, label) {
    setRejectionReason('');
    setRejectionTarget({ type, label });
  }

  async function confirmReject() {
    await updateDocumentStatus(rejectionTarget.type, DOCUMENT_STATUS.REJETE, rejectionReason);
    setRejectionTarget(null);
  }

  async function handleStatusChange(nextStatus) {
    if (!canTransitionTo(dossier.statut, nextStatus)) return; // garde-fou silencieux, l'UI ne propose que le permis
    await api.dossiers.updateStatus(dossier.id, nextStatus);
    const historyEntry = {
      id: Date.now(),
      ancien_statut: dossier.statut,
      nouveau_statut: nextStatus,
      modifie_par_nom: `${user?.prenom ?? 'Toi'} (agence)`,
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
      <Link to="/agence/dossiers" className="font-body text-sm text-text-secondary hover:text-primary">
        ← Retour aux dossiers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-text-secondary">{dossier.numero_dossier}</p>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            {dossier.pelerin.prenom} {dossier.pelerin.nom}
          </h1>
          <p className="mt-1 font-body text-sm text-text-secondary">
            Dossier créé le {formatDate(dossier.created_at, 'long')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge
            label={DOSSIER_STATUS_LABELS[dossier.statut]}
            semantic={DOSSIER_STATUS_COLOR[dossier.statut]}
          />
          <DossierStatusSelect currentStatus={dossier.statut} onChange={handleStatusChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-text-primary">Documents</h2>
            <span className="font-mono text-sm text-text-secondary">
              {progress.validated}/{progress.total} validés
            </span>
          </div>
          <ProgressBar percent={progress.percent} />
          <div className="mt-4 divide-y divide-border">
            {checklist.map(({ type, label, document }) => (
              <DocumentChecklistItem
                key={type}
                label={label}
                document={document}
                onValidate={() => handleValidate(type)}
                onReject={() => openRejectModal(type, label)}
              />
            ))}
          </div>
        </div>

        <div className="card h-fit space-y-3">
          <h2 className="font-display text-lg font-semibold text-text-primary">Pèlerin</h2>
          <InfoLine label="Nom complet" value={`${dossier.pelerin.prenom} ${dossier.pelerin.nom}`} />
          <InfoLine label="Téléphone" value={dossier.pelerin.telephone} />
          <InfoLine label="Agence" value={dossier.agence.nom} />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">
          Historique du dossier
        </h2>
        <StatusHistoryTimeline entries={dossier.historique ?? []} />
      </div>

      <Modal
        title={`Rejeter — ${rejectionTarget?.label ?? ''}`}
        isOpen={!!rejectionTarget}
        onClose={() => setRejectionTarget(null)}
      >
        <label className="mb-1.5 block font-body text-sm font-medium text-text-primary">
          Motif du rejet
        </label>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={3}
          placeholder="Ex : document illisible, information manquante…"
          className="input-field resize-none"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setRejectionTarget(null)}
            className="rounded-md px-4 py-2 font-body text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Annuler
          </button>
          <button
            onClick={confirmReject}
            disabled={!rejectionReason.trim()}
            className="rounded-md bg-danger px-4 py-2 font-body text-sm font-semibold text-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirmer le rejet
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
      telephone: dossier.telephone,
    },
    agence: dossier.agence ?? { nom: dossier.nom_agence ?? 'Non attribuée' },
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
