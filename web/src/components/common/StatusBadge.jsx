/**
 * Traduit une clé sémantique de couleur (voir shared DOSSIER_STATUS_COLOR /
 * DOCUMENT_STATUS_COLOR) en classes Tailwind. Un seul endroit à modifier
 * si la palette de statuts évolue.
 */
const SEMANTIC_CLASSES = {
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
  neutral: 'bg-neutral-tint text-neutral',
};

/**
 * @param {{ label: string, semantic: 'success'|'warning'|'danger'|'info'|'neutral' }} props
 */
export default function StatusBadge({ label, semantic = 'neutral' }) {
  return <span className={`badge ${SEMANTIC_CLASSES[semantic] ?? SEMANTIC_CLASSES.neutral}`}>{label}</span>;
}
