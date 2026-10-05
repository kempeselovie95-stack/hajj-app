import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC; script.async = true; script.defer = true;
    script.onload = resolve; script.onerror = () => { scriptPromise = null; reject(new Error('gis')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

/**
 * « Continuer avec Google » (Google Identity Services). L'identifiant client vient du serveur (GOOGLE_CLIENT_ID).
 * Le jeton Google est vérifié par le backend, qui crée le compte pèlerin au premier passage.
 */
export default function GoogleButton({ onSuccess, onError }) {
  const { api, loginWithGoogle } = useAuth();
  const { t, language } = useLanguage();
  const holder = useRef(null);
  const [clientId, setClientId] = useState(undefined); // undefined = chargement, null = non configuré
  const [ready, setReady] = useState(false);

  useEffect(() => { api.auth.config().then((config) => setClientId(config.google_client_id || null)).catch(() => setClientId(null)); }, [api]);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !holder.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try { const user = await loginWithGoogle(credential); onSuccess?.(user); }
          catch (error) { onError?.(error.status === 503 ? t('g_notConfigured') : t('g_error')); }
        },
      });
      window.google.accounts.id.renderButton(holder.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: language, width: holder.current.clientWidth || 320 });
      setReady(true);
    }).catch(() => onError?.(t('g_error')));
    return () => { cancelled = true; };
  }, [clientId, language]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-text-secondary"><span className="h-px flex-1 bg-border" />{t('g_or')}<span className="h-px flex-1 bg-border" /></div>
      <div className="mt-4 flex min-h-[44px] justify-center">
        {clientId && ready ? null : (
          <button type="button" onClick={() => { if (clientId === null) onError?.(t('g_notConfigured')); }} disabled={clientId === undefined}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.9-9.9 6.9-17.4z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
            {t('g_continue')}
          </button>
        )}
        <div ref={holder} className={clientId && ready ? 'w-full' : 'h-0 w-full overflow-hidden'} />
      </div>
    </div>
  );
}
