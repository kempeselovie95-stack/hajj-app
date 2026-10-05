import { useMemo, useState } from 'react';
import { useNotifications } from '../../contexts/NotificationsContext.jsx';
import NotificationCard from '../../components/notifications/NotificationCard.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const filters = [
    { value: 'all', label: t('allNotifications') },
    { value: 'unread', label: t('unreadNotifications') },
  ];
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.lue) : notifications),
    [notifications, filter]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('notificationsTitle')}</h1>
          <p className="mt-1 font-body text-text-secondary">
            {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allCaughtUp')}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="font-body text-sm font-medium text-primary hover:text-primary-hover"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-[#FAF7F0]'
                : 'bg-surface-muted text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card !p-2">
        {filtered.length === 0 ? (
          <p className="p-6 text-center font-body text-sm text-text-secondary">
            {filter === 'unread' ? t('np_noneUnread') : t('np_noneAll')}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() => markAsRead(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
