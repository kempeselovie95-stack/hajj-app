import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { printReceipt } from '../../utils/receipt.js';

const PAYMENT_METHODS = ['especes', 'virement', 'mobile_money', 'cheque', 'autre'];

export default function PaymentManagementPage() {
  const { api } = useAuth();
  const { t, language, formatNumber, formatCurrency, formatDateTime } = useLanguage();
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
      .catch(() => { if (active) setError(t('pay_loadError')); })
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
      setError(t('pay_selectDossier'));
      return;
    }
    if (Number(form.montant) > remainingAmount) {
      setError(t('pay_overBalance', { amount: formatCurrency(remainingAmount, selectedPackage.devise) }));
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
      setNotice(t('pay_recordedNotice'));
      setReloadCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || t('pay_createFailed'));
    } finally { setSaving(false); }
  }

  async function processPayment(paymentId, status) {
    setProcessingId(paymentId);
    setError('');
    try {
      await api.payments.updateStatus(paymentId, status);
      setNotice(status === 'valide' ? t('pay_approvedNotice') : t('pay_rejectedNotice'));
      setReloadCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('pay_processFailed'));
    } finally { setProcessingId(null); }
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{t('pay_kicker')}</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">{t('pay_title')}</h1><p className="mt-2 text-sm text-slate-500">{t('pay_subtitle')}</p></div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-700" /><span className="sr-only">{t('c_seasonLabel')}</span><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="bg-transparent outline-none">{data.saisons.length === 0 && <option value={selectedYear}>{data.saison?.libelle || t('c_seasonCurrent')}</option>}{data.saisons.map((season) => <option key={season.id} value={season.annee}>{season.libelle || `Hajj ${season.annee}`}</option>)}</select></label>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section aria-label={t('pay_summaryLabel')} className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label={t('pay_recorded')} value={loading ? '—' : formatNumber(stats.total)} detail={t('pay_thisSeason')} />
        <SummaryCard label={t('pay_collected')} value={loading ? '—' : formatCurrency(stats.encaisse)} detail={t('pay_approvedDetail')} />
        <SummaryCard label={t('pay_toApprove')} value={loading ? '—' : formatCurrency(stats.enAttente)} detail={t('pay_pendingDetail')} />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-slate-800">{t('pay_history')}</h2><p className="mt-1 text-xs text-slate-500">{t('pay_txCount', { count: filteredPayments.length })}</p></div>
            <label className="sr-only" htmlFor="payment-status-filter">{t('pay_filterLabel')}</label>
            <select id="payment-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="tous">{t('pay_all')}</option><option value="en_attente">{t('pay_pending')}</option><option value="valide">{t('pay_approvedF')}</option><option value="rejete">{t('pay_rejectedF')}</option></select>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-start text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">{t('pay_colPilgrim')}</th><th className="px-4 py-3 font-medium">{t('pay_colMethod')}</th><th className="px-4 py-3 font-medium">{t('pay_colAmount')}</th><th className="px-4 py-3 font-medium">{t('pay_colStatus')}</th><th className="px-4 py-3 font-medium">{t('pay_colDate')}</th><th className="px-5 py-3 text-end font-medium">{t('pay_colActions')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-400">{t('pay_loadingTx')}</td></tr>
                  : filteredPayments.map((payment) => <tr key={payment.id}>
                    <td className="px-5 py-4"><div className="font-medium text-slate-800">{payment.pelerin_nom}</div><div className="mt-1 text-xs text-slate-500">{payment.numero_dossier} · {payment.forfait_nom || t('pay_defaultPackage')}</div></td>
                    <td className="px-4 py-4 text-slate-600">{methodLabel(payment.moyen_paiement, t)}</td>
                    <td className="px-4 py-4 font-medium tabular-nums text-slate-800">{formatCurrency(payment.montant, payment.devise)}</td>
                    <td className="px-4 py-4"><PaymentStatus status={payment.statut} /></td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(payment.cree_le)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      {payment.statut === 'en_attente' && <><button type="button" disabled={processingId === payment.id} onClick={() => processPayment(payment.id, 'valide')} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50">{t('pay_approve')}</button><button type="button" disabled={processingId === payment.id} onClick={() => processPayment(payment.id, 'rejete')} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{t('pay_reject')}</button></>}
                      {payment.statut === 'valide' && <button type="button" onClick={() => printReceipt(payment, { t, language, formatCurrency, formatDateTime })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('pay_receipt')}</button>}
                    </div></td>
                  </tr>)}
                {!loading && !filteredPayments.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-sm text-slate-400">{t('pay_none')}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={submitPayment} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div><h2 className="font-semibold text-slate-800">{t('pay_formTitle')}</h2><p className="mt-1 text-xs text-slate-500">{t('pay_formSub')}</p></div>
          <Field label={t('pay_fDossier')}><select required value={form.dossier_id} onChange={(event) => chooseDossier(event.target.value)} className="field"><option value="">{t('pay_fDossierChoose')}</option>{data.dossiers.map((dossier) => {
            const assignedPackage = data.forfaits.find((item) => Number(item.id) === Number(dossier.forfait_id)) || dossier;
            const available = Math.max(0, Number(assignedPackage.prix || 0) - Number(dossier.montant_reserve || 0));
            return <option key={dossier.id} value={dossier.id} disabled={dossier.forfait_id && !available}>{dossier.pelerin_nom} · {dossier.numero_dossier}</option>;
          })}</select></Field>
          {selectedDossier && !selectedDossier.forfait_id && <Field label={t('pay_fPackage')}><select required value={form.forfait_id} onChange={(event) => {
            const forfait = data.forfaits.find((item) => String(item.id) === event.target.value);
            const balance = Math.max(0, Number(forfait?.prix || 0) - amountReserved);
            setForm((current) => ({ ...current, forfait_id: event.target.value, montant: balance ? String(balance) : '' }));
          }} className="field"><option value="">{t('pay_fPackageChoose')}</option>{data.forfaits.map((forfait) => <option key={forfait.id} value={forfait.id}>{forfait.nom} · {formatCurrency(forfait.prix, forfait.devise)}</option>)}</select></Field>}
          {selectedPackage && <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600"><div className="flex justify-between gap-3"><span>{t('pay_packageLine', { name: selectedPackage.nom })}</span><span>{formatCurrency(selectedPackage.prix, selectedPackage.devise)}</span></div><div className="mt-1.5 flex justify-between gap-3"><span>{t('pay_balance')}</span><strong className="font-semibold text-slate-800">{formatCurrency(remainingAmount, selectedPackage.devise)}</strong></div></div>}
          <Field label={t('pay_fAmount')}><input required type="number" min="1" max={remainingAmount || undefined} step="1" value={form.montant} onChange={(event) => setForm((current) => ({ ...current, montant: event.target.value }))} className="field" placeholder={t('pay_amountPlaceholder')} /></Field>
          <Field label={t('pay_fMethod')}><select value={form.moyen_paiement} onChange={(event) => setForm((current) => ({ ...current, moyen_paiement: event.target.value }))} className="field">{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{t(`method_${method}`)}</option>)}</select></Field>
          <Field label={t('pay_fReference')}><input maxLength="120" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} className="field" placeholder={t('pay_refPlaceholder')} /></Field>
          <Field label={t('pay_fComment')}><textarea maxLength="2000" rows="2" value={form.commentaire} onChange={(event) => setForm((current) => ({ ...current, commentaire: event.target.value }))} className="field resize-y" /></Field>
          <button type="submit" disabled={saving || loading || !data.dossiers.length || !remainingAmount} className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? t('c_saving') : t('pay_submit')}</button>
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
  const { t } = useLanguage();
  const style = status === 'valide' ? 'bg-emerald-50 text-emerald-700' : status === 'rejete' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{t(`paystatus_${status}`)}</span>;
}

function methodLabel(value, t) {
  return PAYMENT_METHODS.includes(value) ? t(`method_${value}`) : value || '—';
}
