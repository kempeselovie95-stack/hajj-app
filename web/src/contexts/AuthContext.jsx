import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDataSync } from './DataSyncContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { createApiClient, createHajjApi, HOME_ROUTE_BY_ROLE } from '@hajj/shared';

const TOKEN_STORAGE_KEY = 'hajj_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true tant qu'on n'a pas vérifié la session
  const { bump } = useDataSync();
  const bumpRef = useRef(bump);
  bumpRef.current = bump;

  // Le client API est mémorisé une seule fois : c'est lui qui gère
  // l'injection du token et la déconnexion auto sur 401.
  const api = useMemo(() => {
    const client = createApiClient({
      // En développement, les appels relatifs passent par le proxy Vite.
      baseURL: import.meta.env.VITE_API_URL || window.location.origin,
      getToken: () => localStorage.getItem(TOKEN_STORAGE_KEY),
      // Chaque écriture réussie déclenche le rafraîchissement des écrans « live ».
      onMutation: () => bumpRef.current(),
      onUnauthorized: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      },
    });
    return createHajjApi(client);
  }, []);

  // Temps réel : une écriture d'un autre utilisateur rafraîchit tout de suite les écrans « live ».
  useRealtime({
    sync: (event) => { if (event.by !== user?.id) bumpRef.current(); },
    'group:call': (event) => window.dispatchEvent(new CustomEvent('hajj:notification', { detail: { titre: event.type === 'audio' ? '📞 Appel audio' : '🎥 Appel vidéo', corps: `${event.par} — ${event.type}`, type: 'message' } })),
    // Nouveau message de groupe : badge sur « Groupes » + alerte, pas dans « Notifications ».
    'group:unread': (event) => { bumpRef.current(); window.dispatchEvent(new CustomEvent('hajj:notification', { detail: { ...event, type: 'message' } })); },
  }, { enabled: !!user });

  // Au montage : si un token existe, on tente de restaurer la session
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.auth
      .me()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false));
  }, [api]);

  const register = useCallback(
    async (payload) => {
      const { token, user: newUser } = await api.auth.registerPelerin(payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setUser(newUser);
      return newUser;
    },
    [api]
  );

  const login = useCallback(
    async (email, password) => {
      const { token, user: loggedUser } = await api.auth.login(email, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setUser(loggedUser);
      return loggedUser;
    },
    [api]
  );

  const loginWithGoogle = useCallback(
    async (credential) => {
      const { token, user: googleUser } = await api.auth.google(credential);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setUser(googleUser);
      return googleUser;
    },
    [api]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await api.auth.updateProfile(payload);
    setUser(data.user);
    return data.user;
  }, [api]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      api,
      homeRoute: user ? HOME_ROUTE_BY_ROLE[user.role] : '/login',
    }),
    [user, isLoading, login, register, loginWithGoogle, logout, api]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.');
  return ctx;
}
