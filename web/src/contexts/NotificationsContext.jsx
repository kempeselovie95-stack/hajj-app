import { createContext, useContext, useMemo, useState } from 'react';
import { MOCK_NOTIFICATIONS } from '../mocks/mockNotifications.js';

const NotificationsContext = createContext(null);

/**
 * TODO(intégration) : au montage, appeler `api.notifications.list()` pour
 * initialiser l'état, et `api.notifications.markAsRead(id)` dans
 * `markAsRead` avant (ou en parallèle de) la mise à jour optimiste locale.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.lue).length, [notifications]);

  function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lue: true } : n)));
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
  }

  const value = useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead }),
    [notifications, unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications doit être utilisé à l\'intérieur de <NotificationsProvider>.');
  return ctx;
}
