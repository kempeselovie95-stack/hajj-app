import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useDataSync } from './DataSyncContext.jsx';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { api, isAuthenticated } = useAuth();
  const { version } = useDataSync();
  const [notifications, setNotifications] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadTotal(0);
      setIsLoading(false);
      return () => { mounted = false; };
    }

    const loadNotifications = () => api.notifications.list()
      .then((data) => {
        if (!mounted) return;
        setNotifications((data.notifications ?? []).map(normalizeNotification));
        setUnreadTotal(Number(data.non_lues ?? (data.notifications ?? []).filter((item) => !item.est_lue).length));
      })
      .catch(() => {
        if (mounted) { setNotifications([]); setUnreadTotal(0); }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    loadNotifications();
    return () => { mounted = false; };
  }, [api, isAuthenticated, version]);

  const unreadCount = unreadTotal;

  async function markAsRead(id) {
    const wasUnread = notifications.some((notification) => notification.id === id && !notification.lue);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lue: true } : n)));
    if (wasUnread) setUnreadTotal((count) => Math.max(0, count - 1));
    await api.notifications.markAsRead(id);
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    setUnreadTotal(0);
    await api.notifications.markAllAsRead();
  }

  const value = useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllAsRead, isLoading }),
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
