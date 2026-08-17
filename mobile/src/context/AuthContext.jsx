import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createApiClient, createHajjApi } from '@hajj/shared';

const TOKEN_STORAGE_KEY = 'hajj_token';

// À externaliser en variable d'environnement (voir app.config.js) une fois
// l'URL du backend de prod connue. En dev, remplacer par l'IP LAN de la
// machine qui fait tourner Laragon (localhost ne fonctionne pas depuis un
// appareil/émulateur physique).
const API_BASE_URL = 'http://192.168.1.X:3000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const api = useMemo(() => {
    const client = createApiClient({
      baseURL: API_BASE_URL,
      getToken: () => SecureStore.getItemAsync(TOKEN_STORAGE_KEY),
      onUnauthorized: async () => {
        await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
        setUser(null);
      },
    });
    return createHajjApi(client);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await api.auth.me();
        setUser(data.user);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api]);

  const login = useCallback(
    async (email, password) => {
      const { token, user: loggedUser } = await api.auth.login(email, password);
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
      setUser(loggedUser);
      return loggedUser;
    },
    [api]
  );

  const register = useCallback(
    async (payload) => {
      const { token, user: newUser } = await api.auth.registerPelerin(payload);
      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
      setUser(newUser);
      return newUser;
    },
    [api]
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, register, logout, api }),
    [user, isLoading, login, register, logout, api]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.');
  return ctx;
}
