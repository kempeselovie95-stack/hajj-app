/**
 * Services API partagés (web + mobile)
 * Toutes les fonctions d'appel au backend sont ici — une seule source de vérité
 */

const { apiClient } = require('./client');

// ── Authentification ──────────────────────────────────────────────────────────
const authService = {
  seConnecter: (email, motDePasse) =>
    apiClient.post('/auth/connexion', { email, mot_de_passe: motDePasse }),

  sInscrire: (donnees) =>
    apiClient.post('/auth/inscription', donnees),

  obtenirProfil: () =>
    apiClient.get('/auth/profil'),

  mettreAJourFcmToken: (fcmToken) =>
    apiClient.patch('/auth/fcm-token', { fcm_token: fcmToken }),
};

// ── Dossiers ──────────────────────────────────────────────────────────────────
const dossiersService = {
  lister: (params = {}) =>
    apiClient.get('/dossiers', { params }),

  obtenir: (id) =>
    apiClient.get(`/dossiers/${id}`),

  creer: (donnees) =>
    apiClient.post('/dossiers', donnees),

  mettreAJourStatut: (id, statut, commentaire) =>
    apiClient.patch(`/dossiers/${id}/statut`, { statut, commentaire }),
};

// ── Documents ─────────────────────────────────────────────────────────────────
const documentsService = {
  uploader: (dossierId, typeDocument, fichier) => {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('type_document', typeDocument);
    return apiClient.post(`/dossiers/${dossierId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Notifications ─────────────────────────────────────────────────────────────
const notificationsService = {
  lister: (params = {}) =>
    apiClient.get('/notifications', { params }),

  marquerLue: (id) =>
    apiClient.patch(`/notifications/${id}/lire`),

  toutMarquerLu: () =>
    apiClient.patch('/notifications/tout-lire'),
};

module.exports = { authService, dossiersService, documentsService, notificationsService };