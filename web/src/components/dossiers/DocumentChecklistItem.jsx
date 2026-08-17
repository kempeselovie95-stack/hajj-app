import { DOCUMENT_STATUS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLOR } from '@hajj/shared';
import StatusBadge from '../common/StatusBadge.jsx';

/**
 * @param {{
 *   label: string,
 *   document: {statut: string, url_fichier: string, motif_rejet?: string}|null,
 *   onValidate: () => void,
 *   onReject: () => void,
 * }} props
 */
export default function DocumentChecklistItem({ label, document, onValidate, onReject }) {
  const isMissing = !document;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="font-body text-sm font-medium text-text-primary">{label}</p>
        {isMissing ? (
          <p className="font-body text-xs text-text-secondary">Pas encore transmis</p>
        ) : (
          <>
            {document.url_fichier && (
              <a
                href={document.url_fichier}
                target="_blank"
                rel="noreferrer"
                className="font-body text-xs text-primary hover:text-primary-hover"
              >
                Voir le fichier
              </a>
            )}
            {document.statut === DOCUMENT_STATUS.REJETE && document.motif_rejet && (
              <p className="mt-0.5 font-body text-xs text-danger">
                Motif : {document.motif_rejet}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {isMissing ? (
          <StatusBadge label="Manquant" semantic="neutral" />
        ) : (
          <StatusBadge
            label={DOCUMENT_STATUS_LABELS[document.statut]}
            semantic={DOCUMENT_STATUS_COLOR[document.statut]}
          />
        )}

        {!isMissing && document.statut === DOCUMENT_STATUS.EN_ATTENTE && (
          <div className="flex gap-2">
            <button
              onClick={onValidate}
              className="rounded-md border border-success px-2.5 py-1 font-body text-xs font-medium text-success hover:bg-success-tint"
            >
              Valider
            </button>
            <button
              onClick={onReject}
              className="rounded-md border border-danger px-2.5 py-1 font-body text-xs font-medium text-danger hover:bg-danger-tint"
            >
              Rejeter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
