import { DOSSIER_STATUS, DOCUMENT_STATUS, DOCUMENT_TYPE } from '@hajj/shared';

/**
 * TODO(intégration) : remplacer entièrement par `api.dossiers.list()` /
 * `api.dossiers.getById()` une fois le backend resynchronisé. Ce fichier
 * n'existe que pour donner un rendu visuel réaliste aux pages en attendant.
 */
export const MOCK_DOSSIERS = [
  {
    id: 1,
    numero_dossier: 'HJ-2026-000142',
    statut: DOSSIER_STATUS.EN_VERIFICATION,
    pelerin: { id: 11, nom: 'Njoya', prenom: 'Amina', telephone: '677123456' },
    agence: { id: 1, nom: 'Al-Baraka Voyages' },
    created_at: '2026-06-02T09:00:00Z',
    historique: [
      { id: 1, ancien_statut: null, nouveau_statut: DOSSIER_STATUS.BROUILLON, modifie_par_nom: 'Amina Njoya', created_at: '2026-06-02T09:00:00Z' },
      { id: 2, ancien_statut: DOSSIER_STATUS.BROUILLON, nouveau_statut: DOSSIER_STATUS.SOUMIS, modifie_par_nom: 'Amina Njoya', created_at: '2026-06-03T10:20:00Z' },
      { id: 3, ancien_statut: DOSSIER_STATUS.SOUMIS, nouveau_statut: DOSSIER_STATUS.EN_VERIFICATION, modifie_par_nom: 'Karim Fotso (agence)', created_at: '2026-06-04T08:00:00Z' },
    ],
    documents: [
      { id: 101, type: DOCUMENT_TYPE.PASSEPORT, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      { id: 102, type: DOCUMENT_TYPE.PHOTO_IDENTITE, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      { id: 103, type: DOCUMENT_TYPE.CERTIFICAT_MEDICAL, statut: DOCUMENT_STATUS.EN_ATTENTE, url_fichier: '#' },
      { id: 104, type: DOCUMENT_TYPE.CERTIFICAT_VACCINATION, statut: DOCUMENT_STATUS.EN_ATTENTE, url_fichier: '#' },
    ],
  },
  {
    id: 2,
    numero_dossier: 'HJ-2026-000143',
    statut: DOSSIER_STATUS.SOUMIS,
    pelerin: { id: 12, nom: 'Fotso', prenom: 'Ibrahim', telephone: '699887766' },
    agence: { id: 1, nom: 'Al-Baraka Voyages' },
    created_at: '2026-06-04T14:30:00Z',
    documents: [
      { id: 105, type: DOCUMENT_TYPE.PASSEPORT, statut: DOCUMENT_STATUS.EN_ATTENTE, url_fichier: '#' },
      { id: 106, type: DOCUMENT_TYPE.PHOTO_IDENTITE, statut: DOCUMENT_STATUS.EN_ATTENTE, url_fichier: '#' },
    ],
  },
  {
    id: 3,
    numero_dossier: 'HJ-2026-000140',
    statut: DOSSIER_STATUS.REJETE,
    pelerin: { id: 13, nom: 'Abdoulaye', prenom: 'Fatima', telephone: '655001122' },
    agence: { id: 1, nom: 'Al-Baraka Voyages' },
    created_at: '2026-05-28T08:15:00Z',
    documents: [
      { id: 107, type: DOCUMENT_TYPE.PASSEPORT, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      {
        id: 108,
        type: DOCUMENT_TYPE.PHOTO_IDENTITE,
        statut: DOCUMENT_STATUS.REJETE,
        url_fichier: '#',
        motif_rejet: 'Photo non conforme (fond non uni)',
      },
    ],
  },
  {
    id: 4,
    numero_dossier: 'HJ-2026-000151',
    statut: DOSSIER_STATUS.VALIDE,
    pelerin: { id: 14, nom: 'Bello', prenom: 'Moussa', telephone: '691234567' },
    agence: { id: 1, nom: 'Al-Baraka Voyages' },
    created_at: '2026-06-10T11:00:00Z',
    documents: [
      { id: 109, type: DOCUMENT_TYPE.PASSEPORT, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      { id: 110, type: DOCUMENT_TYPE.PHOTO_IDENTITE, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      { id: 111, type: DOCUMENT_TYPE.CERTIFICAT_MEDICAL, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      { id: 112, type: DOCUMENT_TYPE.CERTIFICAT_VACCINATION, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
      { id: 113, type: DOCUMENT_TYPE.PREUVE_PAIEMENT, statut: DOCUMENT_STATUS.VALIDE, url_fichier: '#' },
    ],
  },
];

export function findMockDossierById(id) {
  return MOCK_DOSSIERS.find((d) => String(d.id) === String(id)) ?? null;
}
