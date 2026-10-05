import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const EMPTY_FORM = { nom: '', annee_hajj: String(new Date().getFullYear() + 1), agence_id: '', encadreur_id: '' };

export default function GroupsManagementPage() {
  const { api, user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const [groups, setGroups] = useState([]);
  const [guides, setGuides] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pilgrims, setPilgrims] = useState([]);
  const [availablePilgrimId, setAvailablePilgrimId] = useState('');
  const [moveTargetId, setMoveTargetId] = useState('');
  const [workingMemberId, setWorkingMemberId] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.groups.list(),
      api.groups.listGuides(),
      isAdmin ? api.admin.listAgencies() : Promise.resolve({ agences: [] }),
    ])
      .then(([groupData, guideData, agencyData]) => {
        if (!active) return;
        setGroups(groupData.groupes ?? []);
        setGuides(guideData.guides ?? []);
        setAgencies(agencyData.agences ?? []);
      })
      .catch(() => { if (active) setError(t('gr_loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, isAdmin, reloadCount]);

  const visibleGroups = useMemo(() => groups.filter((group) => String(group.annee_hajj) === year), [groups, year]);
  const memberTotal = visibleGroups.reduce((total, group) => total + Number(group.total_membres || 0), 0);
  const average = visibleGroups.length ? (memberTotal / visibleGroups.length).toFixed(1) : '0';
  const groupTargets = visibleGroups.filter((group) => group.id !== selectedGroup?.id && Number(group.agence_id) === Number(selectedGroup?.agence_id));
  const addablePilgrims = pilgrims.filter((pilgrim) => !pilgrim.groupe_id || Number(pilgrim.groupe_id) === Number(selectedGroup?.id));

  function openCreate() {
    setEditor({ id: null });
    setForm({ ...EMPTY_FORM, agence_id: agencies[0] ? String(agencies[0].id) : '' });
    setError('');
  }

  function openEdit(group) {
    setEditor(group);
    setForm({ nom: group.nom, annee_hajj: String(group.annee_hajj), agence_id: String(group.agence_id), encadreur_id: group.encadreur_id ? String(group.encadreur_id) : '' });
    setError('');
  }

  async function saveGroup(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = { nom: form.nom.trim(), annee_hajj: Number(form.annee_hajj), encadreur_id: form.encadreur_id ? Number(form.encadreur_id) : null };
    if (isAdmin) payload.agence_id = Number(form.agence_id);
    try {
      if (editor.id) await api.groups.update(editor.id, payload);
      else await api.groups.create(payload);
      setEditor(null);
      setNotice(editor.id ? t('gr_updated') : t('gr_created'));
      setReloadCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || t('gr_saveError'));
    } finally { setSaving(false); }
  }

  async function openMembers(group) {
    setSelectedGroup({ ...group, membres: [] });
    setMembersLoading(true);
    setError('');
    try {
      const [groupData, pilgrimData] = await Promise.all([api.groups.getById(group.id), api.groups.listPilgrims(group.annee_hajj, group.agence_id)]);
      setSelectedGroup(groupData.groupe);
      setPilgrims(pilgrimData.pelerins ?? []);
      setAvailablePilgrimId('');
      const target = groups.find((candidate) => Number(candidate.agence_id) === Number(group.agence_id) && Number(candidate.annee_hajj) === Number(group.annee_hajj) && candidate.id !== group.id);
      setMoveTargetId(target ? String(target.id) : '');
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('gr_membersError'));
    } finally { setMembersLoading(false); }
  }

  async function reloadSelectedGroup() {
    if (!selectedGroup) return;
    const [groupData, pilgrimData, groupList] = await Promise.all([
      api.groups.getById(selectedGroup.id),
      api.groups.listPilgrims(selectedGroup.annee_hajj, selectedGroup.agence_id),
      api.groups.list(),
    ]);
    setSelectedGroup(groupData.groupe);
    setPilgrims(pilgrimData.pelerins ?? []);
    setGroups(groupList.groupes ?? []);
  }

  async function addPilgrim(event) {
    event.preventDefault();
    if (!availablePilgrimId || !selectedGroup) return;
    setWorkingMemberId(Number(availablePilgrimId));
    setError('');
    try {
      await api.groups.addMember(selectedGroup.id, Number(availablePilgrimId));
      await reloadSelectedGroup();
      setAvailablePilgrimId('');
      setNotice(t('gr_added'));
    } catch (requestError) { setError(requestError.response?.data?.message || t('gr_addError')); }
    finally { setWorkingMemberId(null); }
  }

  async function removePilgrim(pilgrimId) {
    if (!selectedGroup) return;
    setWorkingMemberId(pilgrimId);
    setError('');
    try {
      await api.groups.removeMember(selectedGroup.id, pilgrimId);
      await reloadSelectedGroup();
      setNotice(t('gr_removed'));
    } catch (requestError) { setError(requestError.response?.data?.message || t('gr_removeError')); }
    finally { setWorkingMemberId(null); }
  }

  async function movePilgrim(pilgrimId) {
    if (!selectedGroup || !moveTargetId) return;
    setWorkingMemberId(pilgrimId);
    setError('');
    try {
      await api.groups.moveMember(moveTargetId, pilgrimId, selectedGroup.id);
      await reloadSelectedGroup();
      setNotice(t('gr_moved'));
    } catch (requestError) { setError(requestError.response?.data?.message || t('gr_moveError')); }
    finally { setWorkingMemberId(null); }
  }

  const eligibleGuides = guides.filter((guide) => !isAdmin || String(guide.agence_id) === form.agence_id);

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{t('gr_kicker')}</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">{t('gr_title')}</h1><p className="mt-2 text-sm text-slate-500">{t('gr_subtitle')}</p></div>
        <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="group-year">{t('gr_seasonLabel')}</label><select id="group-year" value={year} onChange={(event) => setYear(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value={new Date().getFullYear() + 1}>{t('gr_hajj', { year: new Date().getFullYear() + 1 })}</option>{[...new Set(groups.map((group) => String(group.annee_hajj)))].filter((item) => item !== String(new Date().getFullYear() + 1)).map((item) => <option key={item} value={item}>{t('gr_hajj', { year: item })}</option>)}</select><button type="button" onClick={openCreate} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">{t('gr_create')}</button></div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="grid gap-3 sm:grid-cols-3" aria-label={t('gr_statsLabel')}>
        <Stat label={t('gr_statGroups')} value={visibleGroups.length} />
        <Stat label={t('gr_statPilgrims')} value={memberTotal} />
        <Stat label={t('gr_statAverage')} value={average} />
      </section>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-6 text-sm text-slate-500">{t('gr_loading')}</p> : visibleGroups.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{t('gr_empty')}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-start text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">{t('gr_colCode')}</th><th className="px-4 py-3 font-medium">{t('gr_colGuide')}</th><th className="px-4 py-3 font-medium">{t('gr_colOrg')}</th><th className="px-4 py-3 font-medium">{t('gr_colPilgrims')}</th><th className="px-4 py-3 text-end font-medium">{t('gr_colManage')}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{visibleGroups.map((group) => <tr key={group.id}>
            <td className="px-4 py-4"><div className="font-mono text-xs font-semibold text-emerald-800">{groupCode(group)}</div><div className="mt-1 font-medium text-slate-800">{group.nom}</div></td>
            <td className="px-4 py-4 text-slate-700">{group.encadreur_nom || t('gr_noGuide')}</td>
            <td className="px-4 py-4 text-slate-600">{group.nom_agence}</td>
            <td className="px-4 py-4 tabular-nums text-slate-700">{group.total_membres}</td>
            <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openMembers(group)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('gr_pilgrimsBtn')}</button><button type="button" onClick={() => openEdit(group)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('gr_editBtn')}</button></div></td>
          </tr>)}</tbody>
        </table></div>}
      </div>

      {editor && <Modal onClose={() => setEditor(null)}>
        <form onSubmit={saveGroup} className="space-y-4">
          <header><h2 className="text-xl font-semibold text-slate-900">{editor.id ? t('gr_editTitle') : t('gr_createTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('gr_codeHint')}</p></header>
          <Field label={t('gr_fName')}><input required maxLength={150} value={form.nom} onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))} className="field" placeholder={t('gr_fNamePlaceholder')} /></Field>
          <Field label={t('gr_fSeason')}><input required type="number" min="2025" max="2100" value={form.annee_hajj} onChange={(event) => setForm((current) => ({ ...current, annee_hajj: event.target.value }))} className="field" /></Field>
          {isAdmin && <Field label={t('gr_fOrg')}><select required value={form.agence_id} onChange={(event) => setForm((current) => ({ ...current, agence_id: event.target.value, encadreur_id: '' }))} className="field"><option value="">{t('gr_fOrgChoose')}</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></Field>}
          <Field label={t('gr_fGuide')}><select value={form.encadreur_id} onChange={(event) => setForm((current) => ({ ...current, encadreur_id: event.target.value }))} className="field"><option value="">{t('gr_noGuide')}</option>{eligibleGuides.map((guide) => <option key={guide.id} value={guide.id}>{guide.prenom} {guide.nom} · {guide.nom_agence}</option>)}</select></Field>
          {editor.id && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('gr_seasonWarn')}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditor(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_saving') : t('c_save')}</button></div>
        </form>
      </Modal>}

      {selectedGroup && <Modal onClose={() => setSelectedGroup(null)} wide>
        <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-emerald-800">{groupCode(selectedGroup)}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedGroup.nom}</h2><p className="mt-1 text-sm text-slate-500">{selectedGroup.encadreur_nom || t('gr_guideNotAssigned')} · {t('gr_membersCount', { count: selectedGroup.total_membres })}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{selectedGroup.annee_hajj}</span></header>
        <form onSubmit={addPilgrim} className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">{t('gr_addPilgrimLabel')}</span><select required value={availablePilgrimId} onChange={(event) => setAvailablePilgrimId(event.target.value)} className="field mt-0"><option value="">{t('gr_addChoose')}</option>{addablePilgrims.filter((pilgrim) => Number(pilgrim.groupe_id) !== Number(selectedGroup.id)).map((pilgrim) => <option key={pilgrim.id} value={pilgrim.id}>{pilgrim.prenom} {pilgrim.nom} · {pilgrim.numero_dossier || pilgrim.email}</option>)}</select></label><button type="submit" disabled={!availablePilgrimId || !!workingMemberId} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t('gr_add')}</button></form>
        {membersLoading ? <p className="py-8 text-center text-sm text-slate-500">{t('gr_membersLoading')}</p> : <div className="mt-4 max-h-[48dvh] overflow-auto rounded-lg border border-slate-200"><table className="w-full min-w-[680px] text-start text-sm"><thead className="sticky top-0 bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">{t('gr_colPilgrim')}</th><th className="px-3 py-2">{t('gr_colDossier')}</th><th className="px-3 py-2">{t('gr_colMove')}</th><th className="px-3 py-2 text-end">{t('gr_colAction')}</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedGroup.membres.map((member) => <tr key={member.id}><td className="px-3 py-3"><div className="font-medium text-slate-800">{member.prenom} {member.nom}</div><div className="text-xs text-slate-500">{member.telephone || member.email}</div></td><td className="px-3 py-3 text-xs text-slate-500">{member.numero_dossier || '—'}</td><td className="px-3 py-3"><select aria-label={t('gr_targetFor', { name: `${member.prenom} ${member.nom}` })} value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)} className="h-8 max-w-44 rounded-md border border-slate-200 bg-white px-2 text-xs"><option value="">{t('gr_moveNone')}</option>{groupTargets.map((target) => <option key={target.id} value={target.id}>{target.nom}</option>)}</select></td><td className="px-3 py-3"><div className="flex justify-end gap-2"><button type="button" disabled={!moveTargetId || workingMemberId === member.id} onClick={() => movePilgrim(member.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-40">{t('gr_move')}</button><button type="button" disabled={workingMemberId === member.id} onClick={() => removePilgrim(member.id)} className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40">{t('gr_remove')}</button></div></td></tr>)}{selectedGroup.membres.length === 0 && <tr><td colSpan="4" className="px-3 py-8 text-center text-sm text-slate-500">{t('gr_noMembers')}</td></tr>}</tbody></table></div>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      </Modal>}
      <style>{`.field{display:block;width:100%;margin-top:.375rem;border:1px solid #dbe2e8;border-radius:.625rem;background:#fff;padding:.625rem .75rem;font-size:.875rem;color:#334155;outline:none}.field:focus{border-color:#14845d;box-shadow:0 0 0 2px rgba(20,132,93,.15)}`}</style>
    </section>
  );
}

function Stat({ label, value }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p></article>;
}

function Field({ label, children }) {
  return <label className="block text-xs font-medium text-slate-600">{label}{children}</label>;
}

function Modal({ children, onClose, wide = false }) {
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'}`}>{children}</div></div>;
}

function groupCode(group) {
  return `CAM-${group.annee_hajj}-${String(group.id).padStart(3, '0')}`;
}