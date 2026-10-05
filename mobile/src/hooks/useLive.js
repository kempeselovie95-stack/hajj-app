import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataSync } from '../sync/DataSyncContext.jsx';

/**
 * Charge des données et les relit automatiquement à chaque `version` de synchronisation
 * (écriture réussie, minuteur, retour au premier plan, tirer-pour-actualiser).
 * Le « chargement » n'est vrai qu'au premier affichage : les rafraîchissements sont silencieux.
 *
 * @returns {{ data: any, loading: boolean, error: boolean, reload: () => void }}
 */
export function useLive(loader, deps = []) {
  const { version } = useDataSync();
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [manual, setManual] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => { if (active) setState({ data, loading: false, error: false }); })
      .catch(() => { if (active) setState((current) => ({ ...current, loading: false, error: true })); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, manual, ...deps]);

  const reload = useCallback(() => setManual((value) => value + 1), []);
  return { ...state, reload };
}
