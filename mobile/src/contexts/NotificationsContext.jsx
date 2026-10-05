import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useDataSync } from '../sync/DataSyncContext.jsx';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { api, isAuthenticated } = useAuth();
  const { version } = useDataSync();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated) {
      setNotifications([]);
      setIsLoading(false);
      return () => { mounted = false; };
    }

    api.notifications.list()
      .then((data) => {
        if (mounted) setNotifications((data.notifications ?? []).map(normalizeNotification));
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [api, isAuthenticated, version]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.lue).length, [notifications]);

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lue: true } : n)));
    await api.notifications.markAsRead(id);
  }

  async function removeNotification(id) {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id)); // retrait immédiat ; restauré si le serveur refuse
    try { await api.notifications.remove(id); }
    catch (error) { setNotifications(previous); throw error; }
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    await api.notifications.markAllAsRead();
  }

  const value = useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, isLoading }),
    [notifications, unreadCount, isLoading]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function normalizeNotification(notification) {
  return {
    ...notification,
    message: notification.message ?? notification.corps ?? '',
    lue: notification.lue ?? Boolean(notification.est_lue),
    created_at: notification.created_at ?? notification.cree_le,
  };
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications doit être utilisé à l\'intérieur de <NotificationsProvider>.');
  return ctx;
}
