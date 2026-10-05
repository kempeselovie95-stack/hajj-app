import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

const DataSyncContext = createContext({ version: 0, bump: () => {} });

const POLL_INTERVAL_MS = 30000;
const DEBOUNCE_MS = 350;

/**
 * Horloge de synchronisation (équivalent du web) : `version` augmente après chaque
 * écriture réussie vers l'API, toutes les 30 s tant que l'app est au premier plan,
 * et quand l'app revient au premier plan. Les écrans « live » relisent leurs données.
 */
export function DataSyncProvider({ children }) {
  const [version, setVersion] = useState(0);
  const timer = useRef(null);

  const bump = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVersion((current) => current + 1), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const tick = () => { if (AppState.currentState === 'active') setVersion((current) => current + 1); };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') tick(); });
    return () => { clearInterval(interval); subscription.remove(); clearTimeout(timer.current); };
  }, []);

  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
}

export function useDataSync() {
  return useContext(DataSyncContext);
}
