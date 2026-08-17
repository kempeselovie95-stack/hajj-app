import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { createApiClient, createHajjApi, HOME_ROUTE_BY_ROLE } from '@hajj/shared';

const TOKEN_STORAGE_KEY = 'hajj_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true tant qu'on n'a pas vérifié la session

  // Le client API est mémorisé une seule fois : c'est lui qui gère
  // l'injection du token et la déconnexion auto sur 401.
  const api = useMemo(() => {
    const client = createApiClient({
      baseURL: '', // proxifié par Vite en dev (voir vite.config.js) ; à définir en prod
      getToken: () => localStorage.getItem(TOKEN_STORAGE_KEY),
      onUnauthorized: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      },
    });
    return createHajjApi(client);
  }, []);

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

  const login = useCallback(
    async (email, password) => {
      const { token, user: loggedUser } = await api.auth.login(email, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setUser(loggedUser);
      return loggedUser;
    },
    [api]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      api,
      homeRoute: user ? HOME_ROUTE_BY_ROLE[user.role] : '/login',
    }),
    [user, isLoading, login, logout, api]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.');
  return ctx;
}
