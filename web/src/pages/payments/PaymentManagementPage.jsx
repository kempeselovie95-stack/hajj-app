import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const PAYMENT_METHODS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'autre', label: 'Autre' },
];
const STATUS_LABELS = { en_attente: 'En attente', valide: 'Validé', rejete: 'Rejeté', annule: 'Annulé' };

export default function PaymentManagementPage() {
  const { api } = useAuth();
  const [data, setData] = useState({ saison: null, saisons: [], paiements: [], dossiers: [], forfaits: [], statistiques: {} });
  const [selectedYear, setSelectedYear] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [form, setForm] = useState({ dossier_id: '', forfait_id: '', montant: '', moyen_paiement: 'mobile_money', reference: '', commentaire: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.payments.list(selectedYear || undefined)
      .then((result) => {
        if (!active) return;
        setData(result);
        setSelectedYear((current) => current || String(result.saison?.annee || ''));
      })
      .catch(() => { if (active) setError('Impossible de charger les paiements. Vérifie la connexion au serveur.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, selectedYear, reloadCount]);

  const selectedDossier = data.dossiers.find((dossier) => String(dossier.id) === form.dossier_id);
  const selectedPackage = useMemo(() => {
    if (selectedDossier?.forfait_id) return data.forfaits.find((item) => Number(item.id) === Number(selectedDossier.forfait_id)) || {
      id: selectedDossier.forfait_id,
      nom: selectedDossier.forfait_nom,
      prix: selectedDossier.forfait_prix,
      devise: selectedDossier.devise || 'XAF',
    };
    return data.forfaits.find((item) => String(item.id) === form.forfait_id);
  }, [data.forfaits, form.forfait_id, selectedDossier]);
  const amountReserved = Number(selectedDossier?.montant_reserve || 0);
  const remainingAmount = selectedPackage ? Math.max(0, Number(selectedPackage.prix || 0) - amountReserved) : 0;
  const filteredPayments = data.paiements.filter((payment) => statusFilter === 'tous' || payment.statut === statusFilter);
  const stats = data.statistiques || {};

  function chooseDossier(dossierId) {
    const dossier = data.dossiers.find((item) => String(item.id) === dossierId);
    const packageId = dossier?.forfait_id ? String(dossier.forfait_id) : String(data.forfaits[0]?.id || '');
    const selected = data.forfaits.find((item) => String(item.id) === packageId) || dossier;
    const balance = Math.max(0, Number(selected?.prix || 0) - Number(dossier?.montant_reserve || 0));
    setForm((current) => ({ ...current, dossier_id: dossierId, forfait_id: packageId, montant: balance ? String(balance) : '' }));
    setError('');
    setNotice('');
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (!selectedDossier || !selectedPackage) {
      setError('Sélectionne un dossier associé à un forfait.');
      return;
    }
    if (Number(form.montant) > remainingAmount) {
      setError(`Le montant dépasse le solde disponible de ${formatCurrency(remainingAmount, selectedPackage.devise)}.`);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.payments.create({
        dossier_id: Number(form.dossier_id),
        forfait_id: Number(form.forfait_id || selectedDossier.forfait_id),
        montant: Number(form.montant),
        moyen_paiement: form.moyen_paiement,
        reference: form.reference.trim() || null,
        commentaire: form.commentaire.trim() || null,
      });
      setForm({ dossier_id: '', forfait_id: '', montant: '', moyen_paiement: 'mobile_money', reference: '', commentaire: '' });
      setNotice('Paiement enregistré. Il est en attente de validation.');
      setReloadCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || 'Le paiement n’a pas pu être enregistré.');
    } finally { setSaving(false); }
  }

  async function processPayment(paymentId, status) {
    setProcessingId(paymentId);
    setError('');
    try {
      await api.payments.updateStatus(paymentId, status);
      setNotice(status === 'valide' ? 'Paiement validé. Le reçu est maintenant disponible.' : 'Paiement rejeté.');
      setReloadCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de traiter ce paiement.');
    } finally { setProcessingId(null); }
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Finances</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Paiements</h1><p className="mt-2 text-sm text-slate-500">Encaissements, soldes et validation des règlements Hajj.</p></div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-700" /><span className="sr-only">Saison Hajj</span><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="bg-transparent outline-none">{data.saisons.length === 0 && <option value={selectedYear}>{data.saison?.libelle || 'Saison courante'}</option>}{data.saisons.map((season) => <option key={season.id} value={season.annee}>{season.libelle || `Hajj ${season.annee}`}</option>)}</select></label>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section aria-label="Synthèse des paiements" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Paiements enregistrés" value={loading ? '—' : formatNumber(stats.total)} detail="Cette saison" />
        <SummaryCard label="Montant encaissé" value={loading ? '—' : formatCurrency(stats.encaisse)} detail="Paiements validés" />
        <SummaryCard label="À valider" value={loading ? '—' : formatCurrency(stats.enAttente)} detail="Montant réservé en attente" />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-slate-800">Historique des transactions</h2><p className="mt-1 text-xs text-slate-500">{filteredPayments.length} transaction{filteredPayments.length === 1 ? '' : 's'}</p></div>
            <label className="sr-only" htmlFor="payment-status-filter">Filtrer par statut</label>
            <select id="payment-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="tous">Tous les statuts</option><option value="en_attente">En attente</option><option value="valide">Validés</option><option value="rejete">Rejetés</option></select>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Pèlerin / dossier</th><th className="px-4 py-3 font-medium">Moyen</th><th className="px-4 py-3 font-medium">Montant</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium">Date</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-400">Chargement des transactions…</td></tr>
                  : filteredPayments.map((payment) => <tr key={payment.id}>
                    <td className="px-5 py-4"><div className="font-medium text-slate-800">{payment.pelerin_nom}</div><div className="mt-1 text-xs text-slate-500">{payment.numero_dossier} · {payment.forfait_nom || 'Forfait'}</div></td>
                    <td className="px-4 py-4 text-slate-600">{methodLabel(payment.moyen_paiement)}</td>
                    <td className="px-4 py-4 font-medium tabular-nums text-slate-800">{formatCurrency(payment.montant, payment.devise)}</td>
                    <td className="px-4 py-4"><PaymentStatus status={payment.statut} /></td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDate(payment.cree_le)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      {payment.statut === 'en_attente' && <><button type="button" disabled={processingId === payment.id} onClick={() => processPayment(payment.id, 'valide')} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50">Valider</button><button type="button" disabled={processingId === payment.id} onClick={() => processPayment(payment.id, 'rejete')} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Rejeter</button></>}
                      {payment.statut === 'valide' && <button type="button" onClick={() => printReceipt(payment)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Imprimer le reçu</button>}
                    </div></td>
                  </tr>)}
                {!loading && !filteredPayments.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-sm text-slate-400">Aucun paiement pour cette saison et ce filtre.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={submitPayment} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div><h2 className="font-semibold text-slate-800">Enregistrer un paiement</h2><p className="mt-1 text-xs text-slate-500">Le paiement sera créé en attente de validation.</p></div>
          <Field label="Dossier pèlerin"><select required value={form.dossier_id} onChange={(event) => chooseDossier(event.target.value)} className="field"><option value="">Sélectionner un dossier</option>{data.dossiers.map((dossier) => {
            const assignedPackage = data.forfaits.find((item) => Number(item.id) === Number(dossier.forfait_id)) || dossier;
            const available = Math.max(0, Number(assignedPackage.prix || 0) - Number(dossier.montant_reserve || 0));
            return <option key={dossier.id} value={dossier.id} disabled={dossier.forfait_id && !available}>{dossier.pelerin_nom} · {dossier.numero_dossier}</option>;
          })}</select></Field>
          {selectedDossier && !selectedDossier.forfait_id && <Field label="Forfait"><select required value={form.forfait_id} onChange={(event) => {
            const forfait = data.forfaits.find((item) => String(item.id) === event.target.value);
            const balance = Math.max(0, Number(forfait?.prix || 0) - amountReserved);
            setForm((current) => ({ ...current, forfait_id: event.target.value, montant: balance ? String(balance) : '' }));
          }} className="field"><option value="">Sélectionner un forfait</option>{data.forfaits.map((forfait) => <option key={forfait.id} value={forfait.id}>{forfait.nom} · {formatCurrency(forfait.prix, forfait.devise)}</option>)}</select></Field>}
          {selectedPackage && <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600"><div className="flex justify-between gap-3"><span>Forfait {selectedPackage.nom}</span><span>{formatCurrency(selectedPackage.prix, selectedPackage.devise)}</span></div><div className="mt-1.5 flex justify-between gap-3"><span>Solde disponible</span><strong className="font-semibold text-slate-800">{formatCurrency(remainingAmount, selectedPackage.devise)}</strong></div></div>}
          <Field label="Montant (FCFA)"><input required type="number" min="1" max={remainingAmount || undefined} step="1" value={form.montant} onChange={(event) => setForm((current) => ({ ...current, montant: event.target.value }))} className="field" placeholder="Ex. 250000" /></Field>
          <Field label="Moyen de paiement"><select value={form.moyen_paiement} onChange={(event) => setForm((current) => ({ ...current, moyen_paiement: event.target.value }))} className="field">{PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></Field>
          <Field label="Référence de transaction (facultatif)"><input maxLength="120" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} className="field" placeholder="Référence bancaire ou mobile" /></Field>
          <Field label="Commentaire (facultatif)"><textarea maxLength="2000" rows="2" value={form.commentaire} onChange={(event) => setForm((current) => ({ ...current, commentaire: event.target.value }))} className="field resize-y" /></Field>
          <button type="submit" disabled={saving || loading || !data.dossiers.length || !remainingAmount} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer en attente'}</button>
        </form>
      </div>
      <style>{`.field{display:block;width:100%;margin-top:.375rem;border:1px solid #dbe2e8;border-radius:.625rem;background:#fff;padding:.625rem .75rem;font-size:.875rem;color:#334155;outline:none}.field:focus{border-color:#14845d;box-shadow:0 0 0 2px rgba(20,132,93,.15)}`}</style>
    </div>
  );
}

function SummaryCard({ label, value, detail }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></article>;
}

function Field({ label, children }) {
  return <label className="block text-xs font-medium text-slate-600">{label}{children}</label>;
}

function PaymentStatus({ status }) {
  const style = status === 'valide' ? 'bg-emerald-50 text-emerald-700' : status === 'rejete' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{STATUS_LABELS[status] || status}</span>;
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatCurrency(value, currency = 'XAF') {
  return `${formatNumber(value)} ${currency === 'XAF' ? 'FCFA' : currency}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function methodLabel(value) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label || value || '—';
}

function printReceipt(payment) {
  const receiptNumber = `REC-${payment.annee_hajj}-${String(payment.id).padStart(6, '0')}`;
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const printWindow = window.open('', '_blank', 'width=720,height=800');
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${safe(receiptNumber)}</title><style>body{font:15px Arial,sans-serif;color:#1f2937;margin:48px auto;max-width:640px}header{border-bottom:2px solid #17734f;padding-bottom:20px}h1{margin:0 0 8px;color:#17734f}dl{display:grid;grid-template-columns:190px 1fr;gap:14px;margin:28px 0}dt{color:#64748b}dd{margin:0;font-weight:600}.amount{margin:30px 0;padding:22px;background:#f0fdf4;font-size:24px;font-weight:700;color:#17734f}.foot{border-top:1px solid #e2e8f0;padding-top:16px;color:#64748b;font-size:12px}@media print{body{margin:0 auto}}</style></head><body><header><h1>MyHajj237 Cameroun</h1><strong>Reçu de paiement · ${safe(receiptNumber)}</strong></header><dl><dt>Pèlerin</dt><dd>${safe(payment.pelerin_nom)}</dd><dt>Dossier</dt><dd>${safe(payment.numero_dossier)}</dd><dt>Forfait</dt><dd>${safe(payment.forfait_nom)}</dd><dt>Moyen de paiement</dt><dd>${safe(methodLabel(payment.moyen_paiement))}</dd><dt>Référence</dt><dd>${safe(payment.reference || '—')}</dd><dt>Date de validation</dt><dd>${safe(formatDate(payment.confirme_le))}</dd></dl><div class="amount">${safe(formatCurrency(payment.montant, payment.devise))}</div><p class="foot">Paiement confirmé. Conservez ce reçu pour vos dossiers.</p><script>window.onload=()=>window.print()</script></body></html>`);
  printWindow.document.close();
}