import { NOTIFICATION_TYPE_ICON, formatRelativeTime } from '@hajj/shared';

/**
 * @param {{ notification: object, onClick: () => void }} props
 */
export default function NotificationCard({ notification, onClick }) {
  const { type, titre, message, lue, created_at } = notification;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-md px-4 py-3 text-left transition-colors hover:bg-surface-muted ${
        lue ? '' : 'bg-primary-tint/40'
      }`}
    >
      <span className="text-xl leading-none" aria-hidden="true">
        {NOTIFICATION_TYPE_ICON[type] ?? 'ℹ️'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-body text-sm font-semibold text-text-primary">{titre}</p>
          {!lue && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
        </div>
        <p className="mt-0.5 font-body text-sm text-text-secondary">{message}</p>
        <p className="mt-1 font-mono text-xs text-text-secondary">{formatRelativeTime(created_at)}</p>
      </div>
    </button>
  );
}
