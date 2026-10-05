import axios from 'axios';

function normalizeBaseURL(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function createApiClient({ baseURL, getToken, onUnauthorized, onMutation }) {
  const normalizedBaseURL = normalizeBaseURL(baseURL);

  if (!normalizedBaseURL) {
    throw new Error(
      'URL du backend absente. Configure VITE_API_URL dans web/.env ou EXPO_PUBLIC_API_URL dans mobile/.env.'
    );
  }

  const client = axios.create({
    baseURL: normalizedBaseURL,
    timeout: 15000,
    headers: { Accept: 'application/json' },
  });

  client.interceptors.request.use(async (config) => {
    const token = await getToken?.();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      // Toute écriture réussie (POST/PUT/PATCH/DELETE) prévient l'application : les tableaux de bord se rafraîchissent.
      const method = String(response.config?.method || 'get').toLowerCase();
      if (method !== 'get') onMutation?.({ method, url: response.config?.url });
      return response;
    },
    async (error) => {
      // Une lecture (GET) qui échoue sur une coupure réseau ou une erreur 5xx est retentée une fois.
      const config = error?.config;
      const status0 = error?.response?.status;
      if (config && String(config.method).toLowerCase() === 'get' && !config.__retried && (!error.response || status0 >= 502)) {
        config.__retried = true;
        await new Promise((resolve) => setTimeout(resolve, 400));
        return client.request(config);
      }
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message;
      const validationMessage = error?.response?.data?.erreurs;

      if (status === 401) {
        await onUnauthorized?.();
      }

      if (!error?.response) {
        const url = error?.config?.baseURL || normalizedBaseURL;
        return Promise.reject({
          status: undefined,
          message:
            `Impossible de joindre le serveur (${url}). ` +
            'Vérifie que le backend est démarré, que le téléphone et le PC sont sur le même Wi-Fi, ' +
            'et que EXPO_PUBLIC_API_URL utilise l’IP LAN du PC (pas localhost).',
          original: error,
        });
      }

      const message =
        backendMessage ||
        (Array.isArray(validationMessage)
          ? validationMessage.map((e) => e.msg || e.message).filter(Boolean).join(' — ')
          : null) ||
        error?.message ||
        'Une erreur réseau est survenue.';

      // `response` est conservé : les écrans lisent `error.response.data.code / .message / .erreurs`.
      return Promise.reject({ status, message, code: error.response.data?.code, data: error.response.data, response: error.response, original: error });
    }
  );

  return client;
}
