/**
 * Rôles applicatifs. Les valeurs sont celles stockées en base
 * (colonne `role` de la table `utilisateurs`) — ne pas modifier
 * sans migration DB associée.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  AGENCE: 'agence',
  PELERIN: 'pelerin',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.AGENCE]: 'Agence',
  [ROLES.PELERIN]: 'Pèlerin',
});

/** Ordre de priorité utilisé pour trier/afficher les rôles dans l'UI admin */
export const ROLES_LIST = [ROLES.ADMIN, ROLES.AGENCE, ROLES.PELERIN];

/**
 * Redirection post-connexion par rôle. Centralisé ici pour que
 * web ET mobile utilisent la même logique de routage.
 */
export const HOME_ROUTE_BY_ROLE = Object.freeze({
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.AGENCE]: '/agence/dashboard',
  [ROLES.PELERIN]: '/dashboard', // mobile: écran d'accueil pèlerin
});
