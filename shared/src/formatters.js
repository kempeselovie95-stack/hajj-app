/**
 * Formate une date ISO en format lisible français.
 * @param {string|Date} date
 * @param {'short'|'long'} [style='short']
 */
export function formatDate(date, style = 'short') {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  });
}

/** Formate une date + heure (ex: pour l'historique de statuts) */
export function formatDateTime(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formate une date en durée relative ("à l'instant", "il y a 5 min"...),
 * utilisé pour les flux de notifications. Retombe sur `formatDate` au-delà
 * de 7 jours, où l'affichage relatif perd son intérêt.
 * @param {string|Date} date
 */
export function formatRelativeTime(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return formatDate(d);
}
