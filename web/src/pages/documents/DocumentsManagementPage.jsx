import { useEffect, useState } from 'react';
import { DOCUMENT_TYPE_LABELS } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';

const STATUSES = ['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'];
const STATUS_LABELS = { ALL: 'Tous les statuts', PENDING: 'À traiter', UNDER_REVIEW: 'En revue', APPROVED: 'Approuvés', REJECTED: 'Nouvelle version requise', EXPIRED: 'Expirés' };

export default function DocumentsManagementPage() {
  const { api } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.documents.listForReview('ALL')
      .then((result) => { if (active) setDocuments(result.documents ?? []); })
      .catch(() => { if (active) setError('Impossible de charger les documents. Vérifie la connexion au serveur.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, refreshCount]);

  const term = search.trim().toLocaleLowerCase('fr');
  const visibleDocuments = documents.filter((document) => (statusFilter === 'ALL' || document.statut === statusFilter)
    && (!term || [document.pelerin_nom, document.numero_dossier, document.type, document.nom_fichier, document.organisation]
      .some((value) => value?.toLocaleLowerCase('fr').includes(term))));
  const pendingCount = documents.filter((document) => ['PENDING', 'UNDER_REVIEW'].includes(document.statut)).length;

  async function updateStatus(documentId, status, rejectionReason = null) {
    setWorkingId(documentId);
    setError('');
    setNotice('');
    try {
      await api.documents.review(documentId, status, rejectionReason);
      setRejectingId(null);
      setReason('');
      setNotice(status === 'APPROVED' ? 'Document approuvé.' : status === 'REJECTED' ? 'Nouvelle version demandée. Le pèlerin a été notifié.' : 'Document pris en revue.');
      setRefreshCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || 'La mise à jour du document a échoué.');
    } finally { setWorkingId(null); }
  }

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Dossiers Hajj</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Documents</h1><p className="mt-2 text-sm text-slate-500">Vérifier les pièces et demander une nouvelle version si nécessaire.</p></div>
        <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">{pendingCount} à traiter</span>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row">
        <label className="min-w-0 flex-1"><span className="sr-only">Rechercher un document</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pèlerin, dossier, type ou fichier…" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
        <label><span className="sr-only">Filtrer les documents par statut</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 sm:w-56">{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Chargement des documents…</p> : !visibleDocuments.length ? <p className="p-10 text-center text-sm text-slate-500">Aucun document pour ce filtre.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Pèlerin / dossier</th><th className="px-4 py-3 font-medium">Document</th><th className="px-4 py-3 font-medium">Téléversé le</th><th className="px-4 py-3 font-medium">Expiration</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 text-right font-medium">Revue</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{visibleDocuments.map((document) => {
              const canReview = ['PENDING', 'UNDER_REVIEW'].includes(document.statut);
              return <tr key={document.id} className="align-top">
                <td className="px-4 py-4"><div className="font-medium text-slate-800">{document.pelerin_nom}</div><div className="mt-1 text-xs text-slate-500">{document.numero_dossier} · {document.organisation || 'Agence non renseignée'}</div></td>
                <td className="px-4 py-4"><div className="font-medium text-slate-700">{DOCUMENT_TYPE_LABELS[document.type] || document.type}</div><DocumentFile document={document} /></td>
                <td className="px-4 py-4 text-xs text-slate-500">{formatDate(document.uploaded_at)}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{document.expiration_date ? formatDate(document.expiration_date, false) : '—'}</td>
                <td className="px-4 py-4"><StatusPill status={document.statut} />{document.rejection_reason && <p className="mt-2 max-w-52 text-xs text-red-700">{document.rejection_reason}</p>}</td>
                <td className="px-4 py-4 text-right">
                  {canReview && <div className="flex flex-wrap justify-end gap-2">
                    {document.statut === 'PENDING' && <button type="button" disabled={workingId === document.id} onClick={() => updateStatus(document.id, 'UNDER_REVIEW')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Prendre en revue</button>}
                    <button type="button" disabled={workingId === document.id} onClick={() => updateStatus(document.id, 'APPROVED')} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50">Valider</button>
                    <button type="button" disabled={workingId === document.id} onClick={() => { setRejectingId(document.id); setReason(''); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Nouvelle version</button>
                  </div>}
                  {rejectingId === document.id && <form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) updateStatus(document.id, 'REJECTED', reason.trim()); }} className="mt-3 min-w-56 space-y-2 text-left">
                    <label className="block text-xs font-medium text-slate-600">Motif communiqué au pèlerin<textarea required maxLength="1000" rows="3" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-emerald-700" /></label>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setRejectingId(null)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600">Annuler</button><button type="submit" disabled={workingId === document.id} className="rounded-lg bg-red-700 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50">Envoyer la demande</button></div>
                  </form>}
                  {!canReview && <span className="text-xs text-slate-400">Revue terminée</span>}
                </td>
              </tr>;
            })}</tbody>
          </table></div>
        )}
      </div>
    </section>
  );
}

function DocumentFile({ document }) {
  if (document.nom_fichier?.match(/\.(png|jpe?g|webp)$/i)) return <a href={document.file_url} target="_blank" rel="noreferrer" className="mt-2 block w-fit"><img src={document.file_url} alt={`Aperçu ${document.type}`} loading="lazy" className="h-16 w-24 rounded-md border border-slate-200 object-cover" /></a>;
  return <a href={document.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-block max-w-56 truncate text-xs text-emerald-800 underline">{document.nom_fichier || 'Ouvrir le fichier'}</a>;
}

function StatusPill({ status }) {
  const tone = status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : status === 'REJECTED' || status === 'EXPIRED' ? 'bg-red-50 text-red-700' : status === 'UNDER_REVIEW' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{STATUS_LABELS[status] || status}</span>;
}

function formatDate(value, includeTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date);
}