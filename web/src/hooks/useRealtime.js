import { useEffect, useRef } from 'react';

const TOKEN_STORAGE_KEY = 'hajj_token';
export const apiBaseUrl = () => import.meta.env.VITE_API_URL || window.location.origin;

/** Flux temps réel du serveur (SSE). `handlers` : { sync, news, 'group:message' } ; `groups` : ids des groupes suivis. */
export function useRealtime(handlers, { groups = [], enabled = true } = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const groupsKey = groups.join(',');

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!enabled || !token || typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(`${apiBaseUrl()}/api/realtime?token=${encodeURIComponent(token)}&groups=${groupsKey}`);
    for (const type of Object.keys(handlersRef.current ?? {})) {
      source.addEventListener(type, (event) => {
        let data = {};
        try { data = JSON.parse(event.data); } catch { /* ignore */ }
        handlersRef.current?.[type]?.(data);
      });
    }
    return () => source.close();
  }, [enabled, groupsKey]);
}
