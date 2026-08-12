/**
 * Client HTTP partagé (web + mobile)
 * Centralise la configuration Axios : base URL, token JWT, gestion erreurs
 *
 * Usage dans web  : import { apiClient } from '../../shared/api/client'
 * Usage en mobile : import { apiClient } from '../../../shared/api/client'
 */

const axios = require('axios');

// L'URL de base est injectée selon la plateforme via les variables d'environnement
const BASE_URL = typeof process !== 'undefined' && process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL
  : 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Intercepteur requête : injecte le token JWT automatiquement ───────────────
apiClient.interceptors.request.use(
  (config) => {
    // Fonctionne aussi bien avec localStorage (web) qu'AsyncStorage (mobile)
    // Le token est injecté par le contexte d'auth qui appelle setTokenGlobal()
    if (tokenGlobal) {
      config.headers.Authorization = `Bearer ${tokenGlobal}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur réponse : normalise les erreurs ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Erreur de connexion au serveur';
    const status  = error.response?.status || 0;

    // Déconnecter automatiquement si le token est expiré (401)
    if (status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    return Promise.reject({ message, status, data: error.response?.data });
  }
);

// ── Mécanismes d'injection du token et du callback de déconnexion ─────────────
let tokenGlobal = null;
let onUnauthorizedCallback = null;

const setTokenGlobal = (token) => { tokenGlobal = token; };
const setOnUnauthorized = (callback) => { onUnauthorizedCallback = callback; };

module.exports = { apiClient, setTokenGlobal, setOnUnauthorized };