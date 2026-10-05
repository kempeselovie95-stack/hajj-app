import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import QrCode from '../../components/common/QrCode.jsx';

const TABS = ['attendance', 'scan', 'incidents'];
const SCAN_PURPOSES = ['CONTROL', 'PRESENCE', 'BOARDING', 'TRANSPORT', 'ARRIVAL', 'ASSISTANCE'];
const CATEGORIES = ['MEDICAL', 'LOST_PERSON', 'TRANSPORT', 'DOCUMENT', 'ACCOMMODATION', 'SECURITY', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const INCIDENT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const ATTENDANCE_TONE = { PRESENT: 'bg-emerald-50 text-emerald-700', ABSENT: 'bg-red-50 text-red-700', TO_CHECK: 'bg-amber-50 text-amber-800', PENDING: 'bg-slate-100 text-slate-600' };
const PRIORITY_TONE = { LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-blue-50 text-blue-700', HIGH: 'bg-amber-50 text-amber-800', URGENT: 'bg-red-50 text-red-700' };

export default function PresencePage() {
  const { api, user } = useAuth();
  const { t } = useLanguage();
  const isManager = user?.role === 'admin' || user?.role === 'agence';
  const [tab, setTab] = useState('attendance');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.groups.list().then((data) => {
      const list = data.groupes ?? [];
      setGroups(list);
      setGroupId((current) => current || (list[0] ? String(list[0].id) : ''));
    }).catch(() => setError(t('gr_loadError')));
  }, [api, t]);

  return (
    <section className="space-y-5 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{t('pr_kicker')}</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">{t('presence')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('pr_subtitle')}</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === name ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{t(`pr_tab_${name}`)}</button>
        ))}
      </div>
      {tab === 'attendance' && <AttendanceTab groups={groups} groupId={groupId} setGroupId={setGroupId} isManager={isManager} />}
      {tab === 'scan' && <ScanTab />}
      {tab === 'incidents' && <IncidentsTab groups={groups} isManager={isManager} />}
    </section>
  );
}

function AttendanceTab({ groups, groupId, setGroupId, isManager }) {
  const { api } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState(null);

  const reload = useCallback(async () => {
    if (!groupId) return;
    try { setData(await api.operations.attendance.group(groupId)); setError(''); }
    catch { setError(t('pr_loadError')); }
    finally { setLoading(false); }
  }, [api, groupId, t]);
  useEffect(() => { setLoading(true); setData(null); reload(); }, [reload]);

  async function mark(member, type) {
    setError('');
    try { await api.operations.attendance.record({ groupe_id: Number(groupId), pelerin_id: member.id, type_evenement: type }); await reload(); }
    catch { setError(t('pr_markError')); }
  }

  async function showQr(member) {
    try { setQr({ member, ...(await api.operations.qr.forPilgrim(member.id)) }); }
    catch { setError(t('qr_loadError')); }
  }

  const counters = data?.compteurs ?? { PRESENT: 0, ABSENT: 0, TO_CHECK: 0, PENDING: 0 };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-600">{t('pr_group')}
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="field !mt-1 min-w-60">{groups.map((group) => <option key={group.id} value={group.id}>{group.nom} ({group.total_membres})</option>)}</select>
        </label>
        <div className="flex flex-wrap gap-2 text-sm">
          {['PRESENT', 'TO_CHECK', 'ABSENT', 'PENDING'].map((key) => <span key={key} className={`rounded-full px-3 py-1 font-medium ${ATTENDANCE_TONE[key]}`}>{t(`att_${key}`)} : {counters[key]}</span>)}
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!groupId ? <p className="p-8 text-center text-sm text-slate-500">{t('pr_noGroups')}</p> : loading ? <p className="p-8 text-center text-sm text-slate-500">{t('loading')}</p> : !data?.membres.length ? <p className="p-8 text-center text-sm text-slate-500">{t('gr_noMembers')}</p> : (
          <ul className="divide-y divide-slate-100">
            {data.membres.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{member.prenom} {member.nom}</p>
                  <p className="text-xs text-slate-500">{member.telephone || '—'}{member.dernier_evenement ? ` · ${t('pr_lastEvent')} ${formatDateTime(member.dernier_evenement)}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ATTENDANCE_TONE[member.statut || 'PENDING']}`}>{t(`att_${member.statut || 'PENDING'}`)}</span>
                  <button type="button" onClick={() => mark(member, 'PRESENT')} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">✓ {t('att_PRESENT')}</button>
                  <button type="button" onClick={() => mark(member, 'TO_CHECK')} className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50">! {t('att_TO_CHECK')}</button>
                  <button type="button" onClick={() => mark(member, 'ABSENT')} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">✕ {t('att_ABSENT')}</button>
                  {isManager && <button type="button" onClick={() => showQr(member)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">QR</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {qr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setQr(null); }}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{qr.member.prenom} {qr.member.nom}</h3>
            <div className="flex justify-center"><QrCode value={qr.token} size={220} label={t('qr_aria')} /></div>
            <p className="font-mono text-sm font-semibold text-slate-700">{qr.code}</p>
            <div className="flex justify-center gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">{t('qr_print')}</button>
              <button type="button" onClick={() => setQr(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('c_close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanTab() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [purpose, setPurpose] = useState('PRESENCE');
  const [place, setPlace] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const videoRef = useRef(null);
  const cameraSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;

  const scan = useCallback(async (value) => {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await api.operations.qr.scan(value.trim(), purpose, place || undefined)); setToken(''); }
    catch (requestError) { setError(requestError.response?.status === 404 ? t('qr_unknown') : requestError.response?.status === 400 ? t('qr_invalid') : t('qr_scanError')); }
    finally { setBusy(false); }
  }, [api, purpose, place, t]);

  useEffect(() => {
    if (!camera) return undefined;
    let stream; let stopped = false; let timer;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) { setCamera(false); await scan(codes[0].rawValue); return; }
          } catch { /* image pas prête */ }
          timer = window.setTimeout(tick, 400);
        };
        tick();
      } catch { setError(t('qr_cameraError')); setCamera(false); }
    })();
    return () => { stopped = true; window.clearTimeout(timer); stream?.getTracks().forEach((track) => track.stop()); };
  }, [camera, scan, t]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={(event) => { event.preventDefault(); if (token.trim()) scan(token); }} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-800">{t('qr_scanTitle')}</h2>
        <label className="block text-xs font-medium text-slate-600">{t('qr_purpose')}
          <select value={purpose} onChange={(event) => setPurpose(event.target.value)} className="field">{SCAN_PURPOSES.map((value) => <option key={value} value={value}>{t(`scan_${value}`)}</option>)}</select>
        </label>
        <label className="block text-xs font-medium text-slate-600">{t('qr_place')}<input maxLength={150} value={place} onChange={(event) => setPlace(event.target.value)} className="field" /></label>
        <label className="block text-xs font-medium text-slate-600">{t('qr_token')}<input value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" spellCheck={false} placeholder={t('qr_tokenHint')} className="field font-mono" /></label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !token.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? t('loading') : t('qr_validate')}</button>
          {cameraSupported && <button type="button" onClick={() => setCamera((value) => !value)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">{camera ? t('qr_stopCamera') : t('qr_useCamera')}</button>}
        </div>
        {camera && <video ref={videoRef} muted playsInline className="w-full rounded-xl bg-slate-900" />}
        {!cameraSupported && <p className="text-xs text-slate-500">{t('qr_noCamera')}</p>}
      </form>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-800">{t('qr_result')}</h2>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!result && !error && <p className="mt-3 text-sm text-slate-500">{t('qr_waiting')}</p>}
        {result && (
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800">{(result.pelerin.prenom[0] || '') + (result.pelerin.nom[0] || '')}</span><div><p className="text-lg font-semibold text-slate-900">{result.pelerin.prenom} {result.pelerin.nom}</p><p className="font-mono text-xs text-slate-500">{result.pelerin.code}</p></div></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">{t('gr_colGroup')}</dt><dd className="text-slate-800">{result.groupe ? `${result.groupe.nom} · ${result.groupe.code}` : '—'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">{t('gr_colGuide')}</dt><dd className="text-slate-800">{result.groupe?.guide || '—'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-500">{t('c_status')}</dt><dd className="text-slate-800">{t(`status_${result.pelerin.statut}`)}</dd></div>
            <p className={`rounded-lg px-3 py-2 ${result.presence_enregistree ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{result.presence_enregistree ? t('qr_recorded', { purpose: t(`scan_${result.motif}`) }) : t('qr_loggedOnly')}</p>
          </dl>
        )}
      </div>
    </div>
  );
}

function IncidentsTab({ groups, isManager }) {
  const { api } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ groupe_id: '', pelerin_id: '', categorie: 'MEDICAL', priorite: 'MEDIUM', description: '' });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try { setItems(await api.operations.incidents.list(filter ? { statut: filter } : {})); setError(''); }
    catch { setError(t('inc_loadError')); }
    finally { setLoading(false); }
  }, [api, filter, t]);
  useEffect(() => { setLoading(true); reload(); }, [reload]);

  useEffect(() => {
    if (!dialog || !form.groupe_id) { setMembers([]); return; }
    api.operations.attendance.group(form.groupe_id).then((data) => setMembers(data.membres)).catch(() => setMembers([]));
  }, [api, dialog, form.groupe_id]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await api.operations.incidents.create({ ...form, groupe_id: Number(form.groupe_id), pelerin_id: form.pelerin_id ? Number(form.pelerin_id) : undefined });
      setDialog(false); setForm((current) => ({ ...current, pelerin_id: '', description: '' })); await reload();
    } catch { setError(t('inc_saveError')); } finally { setSaving(false); }
  }

  async function update(item, patch) {
    try { await api.operations.incidents.update(item.id, patch); await reload(); } catch { setError(t('inc_saveError')); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-600">{t('c_status')}
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="field !mt-1 min-w-44"><option value="">{t('allStatus')}</option>{INCIDENT_STATUSES.map((value) => <option key={value} value={value}>{t(`incstatus_${value}`)}</option>)}</select>
        </label>
        <button type="button" onClick={() => { setForm((current) => ({ ...current, groupe_id: current.groupe_id || (groups[0] ? String(groups[0].id) : '') })); setDialog(true); }} disabled={!groups.length} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{t('inc_report')}</button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">{t('loading')}</p> : !items.length ? <p className="p-8 text-center text-sm text-slate-500">{t('inc_none')}</p> : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t(`inccat_${item.categorie}`)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_TONE[item.priorite]}`}>{t(`incprio_${item.priorite}`)}</span>
                  <span className="text-xs text-slate-500">{item.groupe_nom}{item.pelerin_nom ? ` · ${item.pelerin_nom}` : ''}</span>
                  <time className="ms-auto text-xs text-slate-400">{formatDateTime(item.cree_le)}</time>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-800">{item.description}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{t('inc_reportedBy', { name: item.signale_par_nom })}</span>
                  {isManager ? (
                    <select aria-label={t('c_status')} value={item.statut} onChange={(event) => update(item, { statut: event.target.value })} className="field !mt-0 !w-auto !py-1 text-xs">{INCIDENT_STATUSES.map((value) => <option key={value} value={value}>{t(`incstatus_${value}`)}</option>)}</select>
                  ) : <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{t(`incstatus_${item.statut}`)}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(false); }}>
          <form onSubmit={submit} className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{t('inc_report')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">{t('pr_group')}<select required value={form.groupe_id} onChange={(event) => setForm((c) => ({ ...c, groupe_id: event.target.value, pelerin_id: '' }))} className="field">{groups.map((group) => <option key={group.id} value={group.id}>{group.nom}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">{t('inc_pilgrim')}<select value={form.pelerin_id} onChange={(event) => setForm((c) => ({ ...c, pelerin_id: event.target.value }))} className="field"><option value="">—</option>{members.map((member) => <option key={member.id} value={member.id}>{member.prenom} {member.nom}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">{t('inc_category')}<select value={form.categorie} onChange={(event) => setForm((c) => ({ ...c, categorie: event.target.value }))} className="field">{CATEGORIES.map((value) => <option key={value} value={value}>{t(`inccat_${value}`)}</option>)}</select></label>
              <label className="block text-xs font-medium text-slate-600">{t('inc_priority')}<select value={form.priorite} onChange={(event) => setForm((c) => ({ ...c, priorite: event.target.value }))} className="field">{PRIORITIES.map((value) => <option key={value} value={value}>{t(`incprio_${value}`)}</option>)}</select></label>
            </div>
            <label className="block text-xs font-medium text-slate-600">{t('op_description')}<textarea required rows="4" maxLength={4000} value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} className="field" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setDialog(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button><button type="submit" disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_saving') : t('inc_submit')}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
