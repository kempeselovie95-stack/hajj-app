import { useState } from 'react';
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
import { findMockDossierById } from '../../mocks/mockDossiers.js';

export default function DossierDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  // TODO(intégration) : remplacer par un useEffect appelant
  // api.dossiers.getById(id), avec un état de chargement/erreur 404 réel.
  const initialDossier = findMockDossierById(id);
  const [dossier, setDossier] = useState(initialDossier);
  const [rejectionTarget, setRejectionTarget] = useState(null); // { type, label } | null
  const [rejectionReason, setRejectionReason] = useState('');

  if (!initialDossier) {
    return <Navigate to="/agence/dossiers" replace />;
  }

  const checklist = buildDocumentChecklist(dossier.documents);
  const progress = computeDocumentProgress(dossier.documents);

  function updateDocumentStatus(type, statut, motif_rejet) {
    // TODO(intégration) : appeler api.documents.validate(documentId) ou
    // api.documents.reject(documentId, motif) puis rafraîchir le dossier.
    setDossier((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) =>
        doc.type === type ? { ...doc, statut, ...(motif_rejet ? { motif_rejet } : {}) } : doc
      ),
    }));
  }

  function handleValidate(type) {
    updateDocumentStatus(type, DOCUMENT_STATUS.VALIDE);
  }

  function openRejectModal(type, label) {
    setRejectionReason('');
    setRejectionTarget({ type, label });
  }

  function confirmReject() {
    updateDocumentStatus(rejectionTarget.type, DOCUMENT_STATUS.REJETE, rejectionReason);
    setRejectionTarget(null);
  }

  function handleStatusChange(nextStatus) {
    if (!canTransitionTo(dossier.statut, nextStatus)) return; // garde-fou silencieux, l'UI ne propose que le permis
    // TODO(intégration) : appeler api.dossiers.updateStatus(dossier.id, nextStatus)
    // — le backend devrait créer lui-même l'entrée historique_statuts ;
    // on l'ajoute ici localement pour que la démo reste cohérente sans API.
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

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="font-body text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-body text-sm text-text-primary">{value}</p>
    </div>
  );
}
