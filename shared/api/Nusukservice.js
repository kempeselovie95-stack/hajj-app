/**
 * Service d'intégration API NUSUK (plateforme officielle hajj saoudienne)
 * Documentation : https://www.nusuk.sa
 *
 * Note : L'API NUSUK est réservée aux organisateurs agréés.
 * En attendant vos accréditations, les méthodes retournent des données
 * simulées (mode "mock") activable via NUSUK_MOCK=true dans .env
 */

const axios = require('axios');

const nusukClient = axios.create({
  baseURL: process.env.NUSUK_API_URL || 'https://api.nusuk.sa/v1',
  headers: {
    'Authorization': `Bearer ${process.env.NUSUK_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept-Language': 'fr',
  },
  timeout: 10_000,
});

// ── Mode simulation (pour développement sans accès API réel) ──────────────────
const estEnModeMock = () =>
  process.env.NODE_ENV === 'development' || process.env.NUSUK_MOCK === 'true';

// ── Vérifier le quota Hajj du Cameroun pour une année ────────────────────────
const obtenirQuotaPays = async (annee = new Date().getFullYear()) => {
  if (estEnModeMock()) {
    return {
      pays: 'Cameroun',
      annee,
      quota_total: 800,
      quota_utilise: 234,
      quota_disponible: 566,
      source: 'simulation',
    };
  }

  const { data } = await nusukClient.get(`/quota/${annee}`, {
    params: { country_code: 'CM' },
  });
  return data;
};

// ── Vérifier le statut d'un visa Hajj ────────────────────────────────────────
const verifierStatutVisa = async (numeroPasport) => {
  if (estEnModeMock()) {
    return {
      numero_passeport: numeroPasport,
      statut_visa: 'en_traitement',
      date_soumission: new Date().toISOString(),
      source: 'simulation',
    };
  }

  const { data } = await nusukClient.get('/visa/status', {
    params: { passport_number: numeroPasport },
  });
  return data;
};

// ── Obtenir les informations de la saison Hajj en cours ───────────────────────
const obtenirInfosSaison = async () => {
  if (estEnModeMock()) {
    return {
      annee:              2025,
      date_debut:         '2025-06-04',
      date_fin:           '2025-06-09',
      theme:              'Hajj 1446H',
      inscription_ouverte: true,
      source:             'simulation',
    };
  }

  const { data } = await nusukClient.get('/season/current');
  return data;
};

module.exports = { obtenirQuotaPays, verifierStatutVisa, obtenirInfosSaison };