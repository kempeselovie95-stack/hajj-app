import { useEffect, useState } from 'react';

/** Alertes de nouveaux messages / notifications (poussées par le temps réel) affichées en haut à droite. */
export default function NotificationToasts() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const onNotification = (event) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, ...event.detail }]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 6000);
    };
    window.addEventListener('hajj:notification', onNotification);
    return () => window.removeEventListener('hajj:notification', onNotification);
  }, []);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed end-4 top-4 z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-start shadow-xl">
          <span aria-hidden="true" className="text-xl">{toast.type === 'message' ? '💬' : '🔔'}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{toast.titre}</span><span className="line-clamp-2 text-sm text-slate-600">{toast.corps}</span></span>
        </button>
      ))}
    </div>
  );
}
