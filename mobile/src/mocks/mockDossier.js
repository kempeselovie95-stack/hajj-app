import { DOSSIER_STATUS, DOCUMENT_STATUS, DOCUMENT_TYPE } from '@hajj/shared';

/**
 * TODO(intégration) : remplacer par `api.dossiers.list({ pelerin_id: user.id })`
 * puis `api.documents.listByDossier(dossierId)` une fois le backend
 * resynchronisé. Un seul dossier ici : un pèlerin n'a qu'un dossier actif.
 */
export const MOCK_PELERIN_DOSSIER = {
  id: 1,
  numero_dossier: 'HJ-2026-000142',
  statut: DOSSIER_STATUS.EN_VERIFICATION,
  documents: [
    { id: 101, type: DOCUMENT_TYPE.PASSEPORT, statut: DOCUMENT_STATUS.VALIDE },
    { id: 102, type: DOCUMENT_TYPE.PHOTO_IDENTITE, statut: DOCUMENT_STATUS.VALIDE },
    { id: 103, type: DOCUMENT_TYPE.CERTIFICAT_MEDICAL, statut: DOCUMENT_STATUS.EN_ATTENTE },
    {
      id: 104,
      type: DOCUMENT_TYPE.CERTIFICAT_VACCINATION,
      statut: DOCUMENT_STATUS.REJETE,
      motif_rejet: 'Document illisible, merci de reprendre la photo',
    },
    // preuve_paiement absente volontairement : illustre l'état "manquant"
  ],
  historique: [
    {
      id: 1,
      ancien_statut: null,
      nouveau_statut: DOSSIER_STATUS.SOUMIS,
      modifie_par_nom: 'Toi',
      created_at: '2026-06-02T09:00:00Z',
    },
    {
      id: 2,
      ancien_statut: DOSSIER_STATUS.SOUMIS,
      nouveau_statut: DOSSIER_STATUS.EN_VERIFICATION,
      modifie_par_nom: 'Al-Baraka Voyages',
      created_at: '2026-06-04T11:20:00Z',
    },
  ],
};
