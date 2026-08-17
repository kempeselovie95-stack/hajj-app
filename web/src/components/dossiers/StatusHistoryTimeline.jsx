import { DOSSIER_STATUS_LABELS, formatDateTime } from '@hajj/shared';

/**
 * Affiche le journal des transitions de statut d'un dossier, du plus
 * récent au plus ancien. Différent de `DossierStatusSelect` (qui propose
 * la PROCHAINE transition) : ceci est un historique en lecture seule.
 *
 * @param {{ entries: Array<{id: number|string, ancien_statut: string|null, nouveau_statut: string, modifie_par_nom: string, created_at: string}> }} props
 */
export default function StatusHistoryTimeline({ entries = [] }) {
  if (entries.length === 0) {
    return <p className="font-body text-sm text-text-secondary">Aucun historique disponible.</p>;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <ul className="space-y-4">
      {sorted.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <p className="font-body text-sm text-text-primary">
              {entry.ancien_statut ? (
                <>
                  <span className="text-text-secondary">{DOSSIER_STATUS_LABELS[entry.ancien_statut]}</span>
                  {' → '}
                  <span className="font-medium">{DOSSIER_STATUS_LABELS[entry.nouveau_statut]}</span>
                </>
              ) : (
                <span className="font-medium">{DOSSIER_STATUS_LABELS[entry.nouveau_statut]}</span>
              )}
            </p>
            <p className="font-mono text-xs text-text-secondary">
              {formatDateTime(entry.created_at)} · {entry.modifie_par_nom}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
