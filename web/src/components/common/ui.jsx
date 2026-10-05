import { Link } from 'react-router-dom';

/** En-tête de page homogène : surtitre, titre, description et zone d'actions. */
export function PageHeader({ kicker, title, description, actions }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker && <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{kicker}</p>}
        <h1 className="mt-1 font-display text-3xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const TONES = {
  neutral: 'border-border bg-surface',
  success: 'border-emerald-200 bg-emerald-50/60',
  warning: 'border-amber-200 bg-amber-50/70',
  danger: 'border-red-200 bg-red-50/70',
  info: 'border-sky-200 bg-sky-50/70',
};

/** Carte indicateur : libellé, valeur, précision, lien optionnel. */
export function StatCard({ label, value, hint, tone = 'neutral', to }) {
  const content = (
    <div className={`h-full rounded-xl border p-4 transition ${TONES[tone] ?? TONES.neutral} ${to ? 'hover:shadow-card' : ''}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">{content}</Link> : content;
}

/** Bloc de contenu avec titre et lien « voir tout ». */
export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-base font-semibold text-text-primary">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ children }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary">{children}</p>;
}
