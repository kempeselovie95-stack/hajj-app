import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { useDataSync } from './DataSyncContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { useToast } from '../ui/ToastContext.jsx';
import { chatState } from '../utils/chatState.js';
import { Linking } from 'react-native';
import { buildCallUrl } from '@hajj/shared';

/**
 * Relie le flux temps réel du serveur à l'application :
 *  - `sync` : un autre utilisateur a écrit (document, paiement, actualité…) → tous les écrans « live » se relisent ;
 *  - `notification` : un message ou une alerte arrive → la liste des notifications se relit aussitôt.
 * Toute nouvelle notification non lue apparaît en alerte (toast), que l'info arrive par le flux temps réel
 * ou, sur mobile natif sans EventSource, par le rafraîchissement régulier.
 */
const keyOf = (item) => `${item.id}|${item.message}`; // une notification de message mise à jour compte comme nouvelle

export default function RealtimeSync() {
  const { user, isAuthenticated } = useAuth();
  const { notifications, isLoading } = useNotifications();
  const { bump } = useDataSync();
  const toast = useToast();
  const seen = useRef(null); // ids déjà connus ; null tant que la première lecture n'est pas faite

  useRealtime({
    sync: (event) => { if (!event.polled && event.by !== user?.id) bump(); },
    // L'encadreur lance un appel : alerte avec rejoindre en un toucher.
    'group:call': (event) => {
      if (event.polled) return;
      const kind = event.type === 'audio' ? '📞' : '🎥';
      toast.show(`${kind} ${event.par}`, 'message', { titre: event.type === 'audio' ? 'Appel audio' : 'Appel vidéo', duree: 15000, onPress: () => Linking.openURL(buildCallUrl(event.url, event.type, `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim())) });
    },
    // Nouveau message de groupe : badge « Mon groupe » + alerte (sauf si cette discussion est déjà ouverte).
    'group:unread': (event) => {
      if (event.polled) return;
      bump();
      if (!event.appel && Number(event.groupe_id) !== chatState.openGroupId) toast.show(event.corps, 'message', { titre: event.titre });
    },
  }, { enabled: isAuthenticated && typeof globalThis.EventSource === 'function' });

  useEffect(() => { if (!isAuthenticated) seen.current = null; }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (seen.current === null) { seen.current = new Set(notifications.map(keyOf)); return; }
    const fresh = notifications.filter((item) => !seen.current.has(keyOf(item)) && !item.lue);
    notifications.forEach((item) => seen.current.add(keyOf(item)));
    fresh.slice(0, 2).forEach((item) => toast.show(item.message, 'info', { titre: item.titre }));
  }, [notifications, isLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
