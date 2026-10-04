export function createAuthApi(client) {
  return {
    login: (email, password) =>
      client.post('/api/auth/login', { email, mot_de_passe: password }).then((r) => r.data),
    registerPelerin: (payload) =>
      client.post('/api/auth/register', { ...payload, mot_de_passe: payload.mot_de_passe ?? payload.password }).then((r) => r.data),
    me: () => client.get('/api/auth/me').then((r) => r.data),
    updateProfile: (payload) => client.patch('/api/auth/profile', payload).then((r) => r.data),
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
    listForReview: (statut = 'ALL') => client.get('/api/documents', { params: { statut } }).then((r) => r.data),
    listByDossier: (dossierId) => client.get(`/api/dossiers/${dossierId}/documents`).then((r) => r.data),
    upload: (dossierId, formData) => client.post(`/api/dossiers/${dossierId}/documents`, formData).then((r) => r.data),
    review: (id, statut, motif) => client.patch(`/api/documents/${id}/review`, { statut, motif }).then((r) => r.data),
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

export function createAdminApi(client) {
  return {
    listAgencies: () => client.get('/api/admin/agencies').then((r) => r.data),
    stats: () => client.get('/api/admin/stats').then((r) => r.data),
    dashboard: (annee) => client.get('/api/admin/dashboard', { params: annee ? { annee } : {} }).then((r) => r.data),
    createPilgrim: (payload) => client.post('/api/admin/pelerins', payload).then((r) => r.data),
    createAgency: (payload) => client.post('/api/admin/agencies', payload).then((r) => r.data),
    updateOrganisation: (id, payload) => client.patch(`/api/admin/agencies/${id}/organisation`, payload).then((r) => r.data),
    deleteAgency: (id) => client.delete(`/api/admin/agencies/${id}`).then((r) => r.data),
    listEncadreurs: () => client.get('/api/admin/encadreurs').then((r) => r.data),
    createEncadreur: (payload) => client.post('/api/admin/encadreurs', payload).then((r) => r.data),
    deleteEncadreur: (id) => client.delete(`/api/admin/encadreurs/${id}`).then((r) => r.data),
  };
}

export function createGroupsApi(client) {
  return {
    list: () => client.get('/api/groups').then((r) => r.data),
    listGuides: () => client.get('/api/groups/guides').then((r) => r.data),
    listPilgrims: (annee_hajj, agence_id) => client.get('/api/groups/pelerins', { params: { annee_hajj, agence_id } }).then((r) => r.data),
    getById: (id) => client.get(`/api/groups/${id}`).then((r) => r.data),
    create: (payload) => client.post('/api/groups', payload).then((r) => r.data),
    update: (id, payload) => client.patch(`/api/groups/${id}`, payload).then((r) => r.data),
    addMember: (id, pelerinId) => client.post(`/api/groups/${id}/members`, { pelerin_id: pelerinId }).then((r) => r.data),
    removeMember: (id, pelerinId) => client.delete(`/api/groups/${id}/members/${pelerinId}`).then((r) => r.data),
    moveMember: (targetGroupId, pelerinId, sourceGroupId) => client.post(`/api/groups/${targetGroupId}/members/${pelerinId}/move`, { source_groupe_id: sourceGroupId }).then((r) => r.data),
    listMessages: (id) => client.get(`/api/groups/${id}/messages`).then((r) => r.data),
    sendMessage: (id, formData) => client.post(`/api/groups/${id}/messages`, formData).then((r) => r.data),
  };
}

export function createPaymentsApi(client) {
  return {
    list: (annee) => client.get('/api/paiements', { params: annee ? { annee } : {} }).then((r) => r.data),
    create: (payload) => client.post('/api/paiements', payload).then((r) => r.data),
    updateStatus: (id, statut) => client.patch(`/api/paiements/${id}/statut`, { statut }).then((r) => r.data),
  };
}

export function createDashboardApi(client) {
  return {
    sidebarBadges: () => client.get('/api/dashboard/badges').then((r) => r.data),
  };
}

export function createCatalogApi(client) {
  return {
    dashboard: () => client.get('/api/catalog/dashboard').then((r) => r.data),
    listSeasons: () => client.get('/api/catalog/saisons').then((r) => r.data),
    createSeason: (payload) => client.post('/api/catalog/saisons', payload).then((r) => r.data),
    listPackages: () => client.get('/api/catalog/forfaits').then((r) => r.data),
    createPackage: (payload) => client.post('/api/catalog/forfaits', payload).then((r) => r.data),
  };
}

export function createHajjApi(client) {
  return {
    auth: createAuthApi(client),
    dossiers: createDossiersApi(client),
    documents: createDocumentsApi(client),
    notifications: createNotificationsApi(client),
    admin: createAdminApi(client),
    groups: createGroupsApi(client),
    payments: createPaymentsApi(client),
    dashboard: createDashboardApi(client),
    catalog: createCatalogApi(client),
  };
}
