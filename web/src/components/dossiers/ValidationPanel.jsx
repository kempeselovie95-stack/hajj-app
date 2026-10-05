import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { useDataSync } from '../../contexts/DataSyncContext.jsx';

const STAGES = ['soumis', 'en_verification', 'valide', 'transmis_nusuk', 'confirme'];

/**
 * Processus de validation du dossier : conditions contrôlées par le serveur, puis étapes
 * Soumis → Vérification → Validé → Transmis à NUSUK → Confirmé (saisie de la référence et du visa NUSUK).
 */
export default function ValidationPanel({ dossierId, onChanged }) {
  const { api } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const { version } = useDataSync();
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(null); // { statut, champ, motif_requis }
  const [field, setField] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.dossiers.validation(dossierId).then(setData).catch(() => setData(null)), [api, dossierId]);
  useEffect(() => { load(); }, [load, version]);

  if (!data) return null;
  const stageIndex = STAGES.indexOf(data.statut);
  const rejected = data.statut === 'rejete';

  async function apply() {
    setBusy(true); setError('');
    try {
      const extra = pending.champ ? { [pending.champ]: field } : {};
      await api.dossiers.updateStatus(dossierId, pending.statut, reason || undefined, extra);
      setPending(null); setField(''); setReason('');
      await load();
      onChanged?.();
    } catch (requestError) {
      setError(requestError.message || t('fp_error'));
    } finally { setBusy(false); }
  }

  const detailText = (check) => {
    if (check.key === 'passport_validity' && check.detail[0]) return t('vp_expires', { date: check.detail[0] });
    if (check.key === 'payment_complete' && check.detail[0] === 'pending') return t('vp_pendingPayment');
    if (['documents_sent', 'documents_approved'].includes(check.key) && check.detail.length) return check.detail.map((type) => t(`doctype_${type}`)).join(', ');
    return '';
  };

  return (
    <section className="card space-y-5" aria-label={t('vp_title')}>
      <h2 className="font-display text-lg font-semibold text-text-primary">{t('vp_title')}</h2>

      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STAGES.map((stage, index) => (
          <li key={stage} className={`rounded-full px-3 py-1 font-medium ${index < stageIndex ? 'bg-emerald-100 text-emerald-800' : index === stageIndex ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{t(`nusuk_stage_${stage}`)}</li>
        ))}
        {rejected && <li className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">{t('status_rejete')}</li>}
      </ol>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">{t('vp_checks')}</h3>
        <ul className="space-y-1.5">
          {data.checks.map((check) => (
            <li key={check.key} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true" className={check.ok ? 'text-emerald-600' : check.required ? 'text-red-600' : 'text-amber-500'}>{check.ok ? '✓' : check.required ? '✗' : '!'}</span>
              <span className={check.ok ? 'text-text-secondary' : 'text-text-primary'}>{t(`vp_${check.key}`)}{!check.ok && detailText(check) ? <span className="text-text-secondary"> — {detailText(check)}</span> : null}</span>
            </li>
          ))}
        </ul>
      </div>

      {(data.nusuk.reference || data.nusuk.visa || data.nusuk.motif) && (
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
          <h3 className="font-semibold text-text-primary">{t('vp_nusuk')}</h3>
          {data.nusuk.reference && <p><span className="text-text-secondary">{t('nusuk_reference')} :</span> <span className="font-mono">{data.nusuk.reference}</span>{data.nusuk.transmis_le ? <span className="text-text-secondary"> · {t('vp_transmitted')} {formatDateTime(data.nusuk.transmis_le)}</span> : null}</p>}
          {data.nusuk.visa && <p><span className="text-text-secondary">{t('nusuk_visa')} :</span> <span className="font-mono">{data.nusuk.visa}</span>{data.nusuk.confirme_le ? <span className="text-text-secondary"> · {t('vp_confirmed')} {formatDateTime(data.nusuk.confirme_le)}</span> : null}</p>}
          {data.nusuk.motif && <p className="text-red-700">{t('vp_refusal')} : {data.nusuk.motif}</p>}
        </div>
      )}

      {data.suivant.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">{t('vp_nextSteps')}</h3>
          <div className="flex flex-wrap gap-2">
            {data.suivant.map((step) => (
              <button key={step.statut} type="button" disabled={step.bloque} title={step.bloque ? t('vp_blocked') : undefined}
                onClick={() => { setPending(step); setField(''); setReason(''); setError(''); }}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${step.statut === 'rejete' || step.statut === 'annule' ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-emerald-700 text-white hover:bg-emerald-800'} disabled:cursor-not-allowed disabled:opacity-40 ${pending?.statut === step.statut ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}>
                {t(`status_${step.statut}`)}
              </button>
            ))}
          </div>
          {pending && (
            <form onSubmit={(event) => { event.preventDefault(); apply(); }} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
              {pending.champ && (
                <label className="block text-xs font-medium text-slate-600">{pending.champ === 'nusuk_reference' ? t('vp_reference') : t('vp_visa')} *
                  <input required value={field} onChange={(event) => setField(event.target.value)} maxLength={100} className="input-field mt-1 font-mono" />
                </label>
              )}
              <label className="block text-xs font-medium text-slate-600">{pending.motif_requis ? t('vp_reason') : t('rejectReason')}{pending.motif_requis ? ' *' : ''}
                <textarea required={pending.motif_requis} value={reason} onChange={(event) => setReason(event.target.value)} rows={2} maxLength={1000} className="input-field mt-1 resize-none" />
              </label>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPending(null)} className="rounded-md px-3 py-1.5 text-sm text-text-secondary">{t('cancel')}</button>
                <button type="submit" disabled={busy} className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? '…' : `${t('vp_apply')} : ${t(`status_${pending.statut}`)}`}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
