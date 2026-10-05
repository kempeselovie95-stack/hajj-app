import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import ProgressBar from '../../components/common/ProgressBar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

const DOC_TONE = { PENDING: 'warning', UNDER_REVIEW: 'info', APPROVED: 'success', REJECTED: 'danger', EXPIRED: 'danger' };
const PAY_TONE = { en_attente: 'warning', valide: 'success', rejete: 'danger', annule: 'neutral' };
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf'];

/** Espace pèlerin : mon dossier, mes pièces (dépôt), mes paiements et mon solde. */
export default function MyDossierPage() {
  const { api } = useAuth();
  const { t, formatCurrency, formatDateTime } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const fileInputs = useRef({});

  const reload = useCallback(async () => {
    try { setData(await api.pelerin.summary()); setError(''); }
    catch { setError(t('md_loadError')); }
    finally { setLoading(false); }
  }, [api, t]);
  useEffect(() => { reload(); }, [reload]);

  async function upload(type, file) {
    if (!file) return;
    setNotice('');
    if (!ACCEPTED.includes(file.type)) { setError(t('md_badType')); return; }
    if (file.size > MAX_BYTES) { setError(t('md_tooBig')); return; }
    setBusy(type); setError('');
    try {
      const form = new FormData();
      form.append('type_document', type);
      form.append('fichier', file);
      await api.documents.upload(data.dossier.id, form);
      setNotice(t('md_uploaded'));
      await reload();
    } catch { setError(t('md_uploadError')); }
    finally { setBusy(''); if (fileInputs.current[type]) fileInputs.current[type].value = ''; }
  }

  async function submitDossier() {
    setBusy('submit'); setError(''); setNotice('');
    try { await api.dossiers.updateStatus(data.dossier.id, 'soumis'); setNotice(t('md_submitted')); await reload(); }
    catch (requestError) { setError(requestError.response?.data?.code === 'DOCUMENTS_MISSING' ? t('md_missingDocs') : t('md_submitError')); }
    finally { setBusy(''); }
  }

  if (loading) return <p className="text-text-secondary">{t('loading')}</p>;
  if (!data?.dossier) return <section className="card"><h1 className="font-display text-2xl font-semibold text-text-primary">{t('md_title')}</h1><p className="mt-2 text-text-secondary">{error || t('md_noDossier')}</p></section>;

  const { dossier, documents, paiements, solde, types_requis: requiredTypes } = data;
  const byType = Object.fromEntries(documents.map((doc) => [doc.type, doc]));
  const approved = requiredTypes.filter((type) => byType[type]?.statut === 'APPROVED').length;
  const sent = requiredTypes.filter((type) => byType[type]).length;
  const percent = Math.round((approved / requiredTypes.length) * 100);
  const canSubmit = ['brouillon', 'rejete'].includes(dossier.statut);
  const paidPercent = solde.total ? Math.min(100, Math.round((solde.paye / solde.total) * 100)) : 0;

  return (
    <section className="space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{dossier.numero_dossier}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('md_title')}</h1>
          <p className="mt-1 text-text-secondary">{[dossier.forfait, dossier.agence, `Hajj ${dossier.annee_hajj}`].filter(Boolean).join(' · ')}</p>
        </div>
        <StatusBadge label={t(`status_${dossier.statut}`)} semantic={{ brouillon: 'neutral', soumis: 'info', en_verification: 'warning', valide: 'success', transmis_nusuk: 'info', confirme: 'success', rejete: 'danger', annule: 'neutral' }[dossier.statut]} />
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('md_documents')}</h2>
          <span className="font-mono text-sm text-text-secondary">{t('md_progress', { approved, total: requiredTypes.length })}</span>
        </div>
        <ProgressBar percent={percent} />
        <ul className="divide-y divide-border">
          {requiredTypes.map((type) => {
            const doc = byType[type];
            const editable = !doc || doc.statut === 'REJECTED' || canSubmit; // une pièce manquante ou rejetée peut toujours être (re)déposée
            return (
              <li key={type} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{t(`doctype_${type}`)}</p>
                  {doc ? <p className="truncate text-xs text-text-secondary">{doc.nom_fichier}</p> : <p className="text-xs text-text-secondary">{t('dci_notSent')}</p>}
                  {doc?.statut === 'REJECTED' && doc.motif_rejet && <p className="mt-0.5 text-xs text-danger">{t('dci_reason', { reason: doc.motif_rejet })}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={doc ? t(`dmstatus_${doc.statut}`) : t('dci_missing')} semantic={doc ? DOC_TONE[doc.statut] : 'neutral'} />
                  {editable && (
                    <label className="cursor-pointer rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-tint">
                      {busy === type ? t('loading') : doc ? t('md_replace') : t('md_upload')}
                      <input ref={(node) => { fileInputs.current[type] = node; }} type="file" accept={ACCEPTED.join(',')} className="sr-only" disabled={busy === type} onChange={(event) => upload(type, event.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-text-secondary">{t('md_fileHint')}</p>
        {canSubmit && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-3">
            <p className="text-sm text-text-secondary">{sent < requiredTypes.length ? t('md_missingCount', { count: requiredTypes.length - sent }) : t('md_readyToSubmit')}</p>
            <button type="button" className="btn-primary" disabled={sent < requiredTypes.length || busy === 'submit'} onClick={submitDossier}>{busy === 'submit' ? t('loading') : t('md_submit')}</button>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">{t('md_payments')}</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {[['md_total', solde.total], ['md_paid', solde.paye], ['md_pending', solde.en_attente], ['md_remaining', solde.restant]].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-muted p-3"><p className="text-xs uppercase tracking-wide text-text-secondary">{t(label)}</p><p className="mt-1 font-semibold tabular-nums text-text-primary">{formatCurrency(value, solde.devise)}</p></div>
          ))}
        </div>
        <ProgressBar percent={paidPercent} label={t('md_paidShare')} />
        {paiements.length === 0 ? <p className="text-sm text-text-secondary">{t('md_noPayments')}</p> : (
          <ul className="divide-y divide-border">{paiements.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div><p className="font-medium tabular-nums text-text-primary">{formatCurrency(payment.montant, payment.devise)}</p><p className="text-xs text-text-secondary">{t(`method_${payment.moyen_paiement}`)} · {formatDateTime(payment.cree_le)}{payment.reference ? ` · ${payment.reference}` : ''}</p></div>
              <StatusBadge label={t(`paystatus_${payment.statut}`)} semantic={PAY_TONE[payment.statut]} />
            </li>
          ))}</ul>
        )}
        <p className="text-xs text-text-secondary">{t('md_paymentHint')}</p>
      </div>
    </section>
  );
}
