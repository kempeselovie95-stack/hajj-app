import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { applyWebTheme, readStoredTheme, resolveTheme, storeTheme } from '../styles/applyTheme.js';

const ThemeContext = createContext({ preference: 'system', mode: 'light', setPreference: () => {}, toggle: () => {} });

/**
 * Thème clair / sombre / automatique, propre à CHAQUE utilisateur : la préférence est enregistrée sur son compte
 * (elle le suit d'un appareil à l'autre) et mémorisée localement pour les écrans de connexion.
 */
export function ThemeProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [preference, setPreferenceState] = useState(readStoredTheme);
  const [mode, setMode] = useState(() => resolveTheme(readStoredTheme()));

  // Au chargement du compte : la préférence enregistrée sur le serveur prend le relais.
  useEffect(() => {
    if (user?.theme && user.theme !== preference) { setPreferenceState(user.theme); storeTheme(user.theme); }
  }, [user?.theme]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMode(applyWebTheme(preference));
    if (preference !== 'system' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setMode(applyWebTheme('system'));
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    storeTheme(next);
    if (user) updateProfile({ theme: next }).catch(() => {}); // enregistré sur le compte
  }, [user, updateProfile]);

  const toggle = useCallback(() => setPreference(mode === 'dark' ? 'light' : 'dark'), [mode, setPreference]);
  const value = useMemo(() => ({ preference, mode, setPreference, toggle }), [preference, mode, setPreference, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
