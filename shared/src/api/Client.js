import axios from 'axios';

/**
 * Crée une instance Axios configurée avec :
 *  - injection automatique du token JWT dans le header Authorization
 *  - déconnexion automatique sur 401 (token expiré/invalide)
 *
 * Le stockage du token diffère entre web (localStorage) et mobile
 * (expo-secure-store, asynchrone) : on injecte donc un adaptateur plutôt
 * que de coder un mécanisme de stockage ici. C'est ce qui permet à ce
 * fichier d'être 100% partagé entre les deux plateformes.
 *
 * @param {Object} config
 * @param {string} config.baseURL - URL de base de l'API backend
 * @param {() => Promise<string|null>|string|null} config.getToken - lit le token stocké
 * @param {() => Promise<void>|void} config.onUnauthorized - appelé sur 401 (ex: purge du token + redirection login)
 * @returns {import('axios').AxiosInstance}
 */
export function createApiClient({ baseURL, getToken, onUnauthorized }) {
  const client = axios.create({
    baseURL,
    timeout: 15000,
  });

  client.interceptors.request.use(async (requestConfig) => {
    const token = await getToken();
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        await onUnauthorized?.();
      }
      // On propage une erreur normalisée pour simplifier la gestion côté UI
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Une erreur réseau est survenue.';
      return Promise.reject({ status, message, original: error });
    }
  );

  return client;
}
