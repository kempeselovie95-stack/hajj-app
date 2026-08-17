import { NOTIFICATION_TYPE } from '@hajj/shared';

/**
 * TODO(intégration) : remplacer par `api.notifications.list()` dans
 * NotificationsContext une fois le backend resynchronisé.
 */
export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: NOTIFICATION_TYPE.DOCUMENT_REJETE,
    titre: 'Document rejeté',
    message: 'La photo d\'identité du dossier HJ-2026-000140 a été rejetée.',
    lue: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: NOTIFICATION_TYPE.STATUT_DOSSIER,
    titre: 'Nouveau dossier soumis',
    message: 'Ibrahim Fotso a soumis son dossier HJ-2026-000143.',
    lue: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: NOTIFICATION_TYPE.DOCUMENT_VALIDE,
    titre: 'Document validé',
    message: 'Le certificat médical du dossier HJ-2026-000151 a été validé.',
    lue: true,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    type: NOTIFICATION_TYPE.INFO,
    titre: 'Rappel NUSUK',
    message: 'La fenêtre de transmission NUSUK pour ce quota se ferme dans 5 jours.',
    lue: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
