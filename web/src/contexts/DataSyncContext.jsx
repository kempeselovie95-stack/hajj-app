import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DataSyncContext = createContext({ version: 0, bump: () => {} });

const POLL_INTERVAL_MS = 30000;
const DEBOUNCE_MS = 350;

/**
 * Horloge de synchronisation des données affichées.
 * `version` augmente :
 *   - après chaque écriture réussie vers l'API (client API → `bump`) ;
 *   - toutes les 30 s tant que l'onglet est visible (changements faits par d'autres utilisateurs) ;
 *   - au retour sur l'onglet / la fenêtre.
 * Les écrans « live » (tableaux de bord, badges, notifications) relisent leurs données quand `version` change.
 */
export function DataSyncProvider({ children }) {
  const [version, setVersion] = useState(0);
  const timer = useRef(null);

  const bump = useCallback(() => {
    window.clearTimeout(timer.current);
    // Anti-rebond : une rafale d'écritures (import, boucle) ne provoque qu'un seul rechargement.
    timer.current = window.setTimeout(() => setVersion((current) => current + 1), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setVersion((current) => current + 1); };
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('online', tick); window.clearTimeout(timer.current); };
  }, []);

  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
}

export function useDataSync() {
  return useContext(DataSyncContext);
}
