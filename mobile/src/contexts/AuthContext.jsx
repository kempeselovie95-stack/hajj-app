import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { storage } from '../storage.js';
import { useDataSync } from '../sync/DataSyncContext.jsx';
import Constants from 'expo-constants';
import { createApiClient, createHajjApi } from '@hajj/shared';
import { Platform } from 'react-native';
import { readThemePreference, saveThemePreference } from '../themeBoot.js';

const TOKEN_STORAGE_KEY = 'hajj_token';
const BACKEND_PORT = 3000;

function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  // Expo Go / development build: utilise automatiquement l'IP du PC
  // qui sert le bundle au lieu de localhost.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  const host = hostUri?.split(':')?.[0];
  if (host && !['localhost', '127.0.0.1', '::1'].includes(host)) {
    return `http://${host}:${BACKEND_PORT}`;
  }

  return `http://localhost:${BACKEND_PORT}`;
}

const API_BASE_URL = getApiBaseUrl();
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { bump } = useDataSync();
  const bumpRef = useRef(bump);
  bumpRef.current = bump;

  const api = useMemo(() => {
    const client = createApiClient({
      baseURL: API_BASE_URL,
      getToken: () => storage.get(TOKEN_STORAGE_KEY),
      // Chaque écriture réussie déclenche le rafraîchissement des écrans « live ».
      onMutation: () => bumpRef.current(),
      onUnauthorized: async () => {
        await storage.remove(TOKEN_STORAGE_KEY);
        setUser(null);
      },
    });
    return createHajjApi(client);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const token = await storage.get(TOKEN_STORAGE_KEY);
      if (!token) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const data = await api.auth.me();
        if (mounted) setUser(data.user);
      } catch {
        await storage.remove(TOKEN_STORAGE_KEY);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [api]);

  // Le thème choisi sur le compte (autre appareil, web…) s'applique à la connexion.
  useEffect(() => {
    if (!user?.theme || user.theme === readThemePreference()) return;
    const reload = saveThemePreference(user.theme);
    if (reload && Platform.OS === 'web') window.location.reload();
  }, [user?.theme]);

  const login = useCallback(async (email, password) => {
    const { token, user: loggedUser } = await api.auth.login(email, password);
    await storage.set(TOKEN_STORAGE_KEY, token);
    setUser(loggedUser);
    return loggedUser;
  }, [api]);

  const register = useCallback(async (payload) => {
    const { token, user: newUser } = await api.auth.registerPelerin(payload);
    await storage.set(TOKEN_STORAGE_KEY, token);
    setUser(newUser);
    return newUser;
  }, [api]);

  const loginWithGoogle = useCallback(async (credential) => {
    const { token, user: googleUser } = await api.auth.google(credential);
    await storage.set(TOKEN_STORAGE_KEY, token);
    setUser(googleUser);
    return googleUser;
  }, [api]);

  const logout = useCallback(async () => {
    await storage.remove(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await api.auth.updateProfile(payload);
    setUser(data.user);
    return data.user;
  }, [api]);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, register, loginWithGoogle, logout, updateProfile, api, apiBaseUrl: API_BASE_URL }),
    [user, isLoading, login, register, loginWithGoogle, logout, updateProfile, api]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  return ctx;
}
