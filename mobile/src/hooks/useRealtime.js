import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { storage } from '../storage.js';
const TOKEN_STORAGE_KEY = 'hajj_token';

const FALLBACK_POLL_MS = 4000;

/**
 * Écoute le flux temps réel du serveur (SSE). `handlers` : { 'group:message': fn, news: fn }.
 * Là où EventSource n'existe pas (React Native natif), on retombe sur un sondage régulier :
 * chaque handler reçoit alors un événement `{ polled: true }`.
 */
export function useRealtime(handlers, { groups = [], enabled = true } = {}) {
  const { apiBaseUrl } = useAuth();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const groupsKey = groups.join(',');

  useEffect(() => {
    if (!enabled) return undefined;
    let source = null;
    let timer = null;
    let cancelled = false;
    const fire = (type, payload) => handlersRef.current?.[type]?.(payload);

    (async () => {
      const token = await storage.get(TOKEN_STORAGE_KEY);
      if (cancelled || !token) return;
      if (typeof globalThis.EventSource === 'function') {
        source = new globalThis.EventSource(`${apiBaseUrl}/api/realtime?token=${encodeURIComponent(token)}&groups=${groupsKey}`);
        for (const type of Object.keys(handlersRef.current ?? {})) {
          source.addEventListener(type, (event) => { let data = {}; try { data = JSON.parse(event.data); } catch { /* ignore */ } fire(type, data); });
        }
      } else {
        timer = setInterval(() => { for (const type of Object.keys(handlersRef.current ?? {})) fire(type, { polled: true }); }, FALLBACK_POLL_MS);
      }
    })();

    return () => { cancelled = true; if (source) source.close(); if (timer) clearInterval(timer); };
  }, [apiBaseUrl, groupsKey, enabled]);
}
