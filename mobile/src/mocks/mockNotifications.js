import { NOTIFICATION_TYPE } from '@hajj/shared';

// TODO(intégration) : remplacer par api.notifications.list() dans NotificationsContext
export const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: NOTIFICATION_TYPE.DOCUMENT_REJETE,
    titre: 'Document rejeté',
    message: 'Ton certificat de vaccination a été rejeté. Vérifie le motif et resoumets-le.',
    lue: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: NOTIFICATION_TYPE.STATUT_DOSSIER,
    titre: 'Dossier en vérification',
    message: 'Ton dossier HJ-2026-000142 est maintenant en cours de vérification par ton agence.',
    lue: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: NOTIFICATION_TYPE.DOCUMENT_VALIDE,
    titre: 'Document validé',
    message: 'Ton passeport a été validé par ton agence.',
    lue: true,
    created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
];
