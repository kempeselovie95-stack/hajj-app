export function createAuthApi(client) {
  return {
    login: (email, password) =>
      client.post('/api/auth/login', { email, mot_de_passe: password }).then((r) => r.data),
    registerPelerin: (payload) =>
      client.post('/api/auth/register', { ...payload, mot_de_passe: payload.mot_de_passe ?? payload.password }).then((r) => r.data),
    me: () => client.get('/api/auth/me').then((r) => r.data),
    config: () => client.get('/api/auth/config').then((r) => r.data),
    google: (credential) => client.post('/api/auth/google', { credential }).then((r) => r.data),
    forgotPassword: (email) => client.post('/api/auth/forgot-password', { email }).then((r) => r.data),
    resetPassword: (payload) => client.post('/api/auth/reset-password', payload).then((r) => r.data),
    updateProfile: (payload) => client.patch('/api/auth/profile', payload).then((r) => r.data),
  };
}

export function createDossiersApi(client) {
  return {
    list: (params = {}) => client.get('/api/dossiers', { params }).then((r) => r.data),
    getById: (id) => client.get(`/api/dossiers/${id}`).then((r) => r.data),
    create: (payload) => client.post('/api/dossiers', payload).then((r) => r.data),
    updateStatus: (id, statut, commentaire, extra = {}) =>
      client.patch(`/api/dossiers/${id}/statut`, { statut, commentaire, ...extra }).then((r) => r.data),
    validation: (id) => client.get(`/api/dossiers/${id}/validation`).then((r) => r.data),
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
    remove: (id) => client.delete(`/api/notifications/${id}`).then((r) => r.data),
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
    startCall: (id, type) => client.post(`/api/groups/${id}/call`, { type }).then((r) => r.data),
    endCall: (id) => client.post(`/api/groups/${id}/call/end`).then((r) => r.data),
    unread: () => client.get('/api/groups/unread').then((r) => r.data),
    markRead: (id) => client.post(`/api/groups/${id}/read`).then((r) => r.data),
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
    overview: (annee) => client.get('/api/dashboard/overview', { params: annee ? { annee } : {} }).then((r) => r.data),
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

/** Opérations Hajj : voyages, vols, hôtels, chambres, transports, programme, présence, QR, incidents. */
export function createOperationsApi(client) {
  const base = '/api/operations';
  const crud = (name) => ({
    list: (params = {}) => client.get(`${base}/${name}`, { params }).then((r) => r.data.items),
    create: (payload) => client.post(`${base}/${name}`, payload).then((r) => r.data.item),
    update: (id, payload) => client.patch(`${base}/${name}/${id}`, payload).then((r) => r.data.item),
    remove: (id) => client.delete(`${base}/${name}/${id}`).then((r) => r.data),
  });
  return {
    trips: crud('trips'),
    flights: { ...crud('flights'), setGroups: (id, groupe_ids) => client.put(`${base}/flights/${id}/groups`, { groupe_ids }).then((r) => r.data.item) },
    hotels: crud('hotels'),
    rooms: {
      ...crud('rooms'),
      byHotel: (hotelId) => client.get(`${base}/hotels/${hotelId}/rooms`).then((r) => r.data),
      assign: (roomId, pelerin_id) => client.post(`${base}/rooms/${roomId}/occupants`, { pelerin_id }).then((r) => r.data),
      unassign: (roomId, pelerinId) => client.delete(`${base}/rooms/${roomId}/occupants/${pelerinId}`).then((r) => r.data),
    },
    vehicles: crud('vehicles'),
    places: { ...crud('places'), nearby: (params) => client.get(`${base}/places/nearby`, { params }).then((r) => r.data) },
    transports: crud('transports'),
    program: crud('program'),
    attendance: {
      group: (groupId) => client.get(`${base}/attendance/groups/${groupId}`).then((r) => r.data),
      record: (payload) => client.post(`${base}/attendance`, payload).then((r) => r.data),
    },
    qr: {
      mine: () => client.get(`${base}/qr/me`).then((r) => r.data),
      forPilgrim: (pelerinId) => client.get(`${base}/qr/pilgrim/${pelerinId}`).then((r) => r.data),
      scan: (token, motif, lieu) => client.post(`${base}/qr/scan`, { token, motif, lieu }).then((r) => r.data),
    },
    incidents: {
      list: (params = {}) => client.get(`${base}/incidents`, { params }).then((r) => r.data.items),
      create: (payload) => client.post(`${base}/incidents`, payload).then((r) => r.data.item),
      update: (id, payload) => client.patch(`${base}/incidents/${id}`, payload).then((r) => r.data.item),
    },
    myTrip: () => client.get(`${base}/me/trip`).then((r) => r.data),
  };
}

/** Actions de l'administrateur d'agence sur sa propre organisation. */
export function createAgencyApi(client) {
  return {
    listGuides: () => client.get('/api/agency/guides').then((r) => r.data),
    createGuide: (payload) => client.post('/api/agency/guides', payload).then((r) => r.data),
    deleteGuide: (id) => client.delete(`/api/agency/guides/${id}`).then((r) => r.data),
    createPilgrim: (payload) => client.post('/api/agency/pelerins', payload).then((r) => r.data),
  };
}

/** Espace pèlerin : synthèse de son dossier, de ses pièces et de ses paiements. */
export function createPelerinApi(client) {
  return {
    summary: () => client.get('/api/pelerin/summary').then((r) => r.data),
    packages: () => client.get('/api/pelerin/forfaits').then((r) => r.data),
    choosePackage: (forfait_id) => client.patch('/api/pelerin/forfait', { forfait_id }).then((r) => r.data),
    declarePayment: (payload) => client.post('/api/pelerin/paiements', payload).then((r) => r.data),
  };
}

/** Cours proposés par les guides aux pèlerins. */
export function createCoursesApi(client) {
  return {
    list: (params = {}) => client.get('/api/courses', { params }).then((r) => r.data.items),
    create: (payload) => client.post('/api/courses', payload).then((r) => r.data.item),
    update: (id, payload) => client.patch(`/api/courses/${id}`, payload).then((r) => r.data.item),
    remove: (id) => client.delete(`/api/courses/${id}`).then((r) => r.data),
    participants: (id) => client.get(`/api/courses/${id}/participants`).then((r) => r.data.items),
    enroll: (id) => client.post(`/api/courses/${id}/enroll`).then((r) => r.data.item),
    unenroll: (id) => client.delete(`/api/courses/${id}/enroll`).then((r) => r.data.item),
    favorite: (id) => client.post(`/api/courses/${id}/favorite`).then((r) => r.data.item),
    unfavorite: (id) => client.delete(`/api/courses/${id}/favorite`).then((r) => r.data.item),
    /** Lien signé (10 min) vers le support PDF : { url, nom, taille }. */
    downloadLink: (id, { kind = 'file', inline = false } = {}) => client.get(`/api/courses/${id}/download-link`, { params: { kind, inline: inline ? 1 : 0 } }).then((r) => r.data),
    /** Détail avec le texte complet du cours (lecture dans l'application). */
    get: (id) => client.get(`/api/courses/${id}`).then((r) => r.data.item),
  };
}

/** Actualités du pèlerinage (format réels) avec « j'aime ». */
export function createNewsApi(client) {
  return {
    list: () => client.get('/api/news').then((r) => r.data.items),
    create: (payload) => client.post('/api/news', payload).then((r) => r.data.item),
    update: (id, payload) => client.patch(`/api/news/${id}`, payload).then((r) => r.data.item),
    remove: (id) => client.delete(`/api/news/${id}`).then((r) => r.data),
    like: (id) => client.post(`/api/news/${id}/like`).then((r) => r.data.item),
    unlike: (id) => client.delete(`/api/news/${id}/like`).then((r) => r.data.item),
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
    operations: createOperationsApi(client),
    agency: createAgencyApi(client),
    pelerin: createPelerinApi(client),
    courses: createCoursesApi(client),
    news: createNewsApi(client),
  };
}
