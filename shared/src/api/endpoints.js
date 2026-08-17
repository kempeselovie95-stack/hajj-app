export function createAuthApi(client) {
  return {
    login: (email, password) =>
      client.post('/api/auth/login', { email, mot_de_passe: password }).then((r) => r.data),
    registerPelerin: (payload) =>
      client.post('/api/auth/register', { ...payload, mot_de_passe: payload.mot_de_passe ?? payload.password }).then((r) => r.data),
    me: () => client.get('/api/auth/me').then((r) => r.data),
  };
}

export function createDossiersApi(client) {
  return {
    list: (params = {}) => client.get('/api/dossiers', { params }).then((r) => r.data),
    getById: (id) => client.get(`/api/dossiers/${id}`).then((r) => r.data),
    create: (payload) => client.post('/api/dossiers', payload).then((r) => r.data),
    updateStatus: (id, statut, commentaire) =>
      client.patch(`/api/dossiers/${id}/statut`, { statut, commentaire }).then((r) => r.data),
  };
}

export function createDocumentsApi(client) {
  return {
    listByDossier: (dossierId) => client.get(`/api/dossiers/${dossierId}/documents`).then((r) => r.data),
    upload: (dossierId, formData) => client.post(`/api/dossiers/${dossierId}/documents`, formData).then((r) => r.data),
    validate: (documentId) => client.patch(`/api/documents/${documentId}/validate`).then((r) => r.data),
    reject: (documentId, motif) => client.patch(`/api/documents/${documentId}/reject`, { motif }).then((r) => r.data),
  };
}

export function createNotificationsApi(client) {
  return {
    list: (params = {}) => client.get('/api/notifications', { params }).then((r) => r.data),
    markAsRead: (id) => client.patch(`/api/notifications/${id}/read`).then((r) => r.data),
    markAllAsRead: () => client.patch('/api/notifications/read-all').then((r) => r.data),
    registerPushToken: (token) => client.patch('/api/auth/fcm-token', { fcm_token: token }).then((r) => r.data),
  };
}

export function createHajjApi(client) {
  return {
    auth: createAuthApi(client),
    dossiers: createDossiersApi(client),
    documents: createDocumentsApi(client),
    notifications: createNotificationsApi(client),
  };
}
