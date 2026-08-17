/**
 * Ce fichier ne contient aucun code exécuté : uniquement des typedefs
 * JSDoc, importables en commentaire (`@typedef {import('@hajj/shared').Dossier}`)
 * pour bénéficier de l'autocomplétion dans Cursor sans configurer TypeScript
 * sur les 4 packages.
 *
 * @typedef {Object} Utilisateur
 * @property {number} id
 * @property {string} nom
 * @property {string} prenom
 * @property {string} email
 * @property {string} telephone
 * @property {'admin'|'agence'|'pelerin'} role
 * @property {number|null} agence_id - null sauf pour role === 'agence'/'pelerin' rattaché
 * @property {string} created_at
 *
 * @typedef {Object} Agence
 * @property {number} id
 * @property {string} nom
 * @property {string} numero_agrement
 * @property {string} telephone
 * @property {string} email
 * @property {string} adresse
 *
 * @typedef {Object} Dossier
 * @property {number} id
 * @property {number} pelerin_id
 * @property {number} agence_id
 * @property {string} numero_dossier - référence lisible (ex: HJ-2026-000123)
 * @property {import('../constants/statuses.js').DOSSIER_STATUS[keyof import('../constants/statuses.js').DOSSIER_STATUS]} statut
 * @property {string} created_at
 * @property {string} updated_at
 *
 * @typedef {Object} DocumentDossier
 * @property {number} id
 * @property {number} dossier_id
 * @property {string} type
 * @property {string} url_fichier
 * @property {string} statut
 * @property {string|null} motif_rejet
 * @property {string} created_at
 *
 * @typedef {Object} Notification
 * @property {number} id
 * @property {number} utilisateur_id
 * @property {string} titre
 * @property {string} message
 * @property {boolean} lue
 * @property {string} created_at
 *
 * @typedef {Object} HistoriqueStatut
 * @property {number} id
 * @property {number} dossier_id
 * @property {string} ancien_statut
 * @property {string} nouveau_statut
 * @property {number} modifie_par - utilisateur_id
 * @property {string} created_at
 */

export {}; // fait de ce fichier un module ES
