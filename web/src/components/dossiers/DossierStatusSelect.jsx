import { getAllowedNextStatuses, DOSSIER_STATUS_LABELS } from '@hajj/shared';

/**
 * @param {{ currentStatus: string, onChange: (nextStatus: string) => void }} props
 */
export default function DossierStatusSelect({ currentStatus, onChange }) {
  const nextOptions = getAllowedNextStatuses(currentStatus);

  if (nextOptions.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        Statut final — aucune transition possible.
      </p>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span className="font-body text-sm text-text-secondary">Faire évoluer vers :</span>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
          e.target.value = '';
        }}
        className="rounded-md border border-border bg-surface px-3 py-1.5 font-body text-sm text-text-primary focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          Choisir…
        </option>
        {nextOptions.map((status) => (
          <option key={status} value={status}>
            {DOSSIER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}
