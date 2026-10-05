import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function PilgrimsPage() {
  const { api, user } = useAuth();
  const { t, locale, formatNumber } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const [dossiers, setDossiers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [packages, setPackages] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [packageFilter, setPackageFilter] = useState('ALL');
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', mot_de_passe: '', saison_id: '', forfait_id: '', agence_id: '' });

  useEffect(() => {
    let active = true;
    setLoading(true);
    const requests = [api.dossiers.list({ page: 1, limite: 100 })];
    requests.push(api.catalog.listSeasons(), api.catalog.listPackages());
    if (isAdmin) requests.push(api.admin.listAgencies());
    Promise.all(requests)
      .then(([dossierData, seasonData, packageData, agencyData]) => {
        if (!active) return;
        setDossiers(dossierData.dossiers ?? []);
        setSeasons((seasonData?.saisons ?? []).filter((season) => season.est_active));
        setPackages(packageData?.forfaits ?? []);
        if (isAdmin) setAgencies(agencyData?.agences ?? []);
        setError('');
      })
      .catch(() => { if (active) { setDossiers([]); setError(t('pg_loadError')); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, isAdmin, refreshCount]);

  const pilgrims = useMemo(() => {
    if (!dossiers?.length) return [];

    return dossiers.map((dossier, index) => {
      const pelerin = dossier.pelerin ?? {};
      const [apiPrenom, ...apiNom] = (dossier.pelerin_nom ?? '').trim().split(/\s+/).filter(Boolean);
      const prenom = pelerin.prenom ?? dossier.prenom ?? apiPrenom ?? t('pg_pilgrimDefault');
      const nom = pelerin.nom ?? dossier.nom ?? apiNom.join(' ') ?? t('pg_anonymous');
      const record = {
        id: dossier.numero_dossier ?? dossier.id ?? `P-${index + 1}`,
        prenom,
        nom,
        telephone: pelerin.telephone ?? dossier.telephone ?? '+237 000 000 000',
        forfait: dossier.forfait ?? t('pg_noPackage'),
        groupe: dossier.groupe ?? t('pg_noGroup'),
        dossier: dossier.statut ?? 'brouillon',
        completion: dossier.total_documents ? Math.round((Number(dossier.documents_approuves || 0) / Number(dossier.total_documents)) * 100) : 0,
        solde: Number(dossier.solde_restant || 0),
        visa: dossier.visa_status ?? 'PENDING',
        avatar: `${(pelerin.prenom ?? dossier.prenom ?? 'P').charAt(0)}${(pelerin.nom ?? dossier.nom ?? 'A').charAt(0)}`.toUpperCase(),
        avatarTone: ['bg-[#8fbce6] text-white', 'bg-[#d1c0ef] text-white', 'bg-[#f1c08f] text-white', 'bg-[#8ac9bf] text-white', 'bg-[#f3d4e6] text-white'][index % 5],
        statusKey: dossier.statut,
        packageKey: dossier.forfait_id ? String(dossier.forfait_id) : 'NONE',
        groupKey: dossier.groupe || 'NONE',
      };

      return record;
    });
  }, [dossiers, t]);

  const groupOptions = [...new Set(pilgrims.map((person) => person.groupKey).filter((value) => value !== 'NONE'))];
  const visiblePilgrims = pilgrims.filter((person) => {
    const term = search.trim().toLocaleLowerCase(locale);
    const matchesText = !term || [person.id, person.prenom, person.nom, person.telephone].some((value) => String(value || '').toLocaleLowerCase(locale).includes(term));
    return matchesText
      && (statusFilter === 'ALL' || person.statusKey === statusFilter)
      && (groupFilter === 'ALL' || person.groupKey === groupFilter)
      && (packageFilter === 'ALL' || person.packageKey === packageFilter);
  });

  const seasonPackages = packages.filter((item) => String(item.saison_id) === form.saison_id);

  async function createPilgrim(event) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form, saison_id: Number(form.saison_id), forfait_id: Number(form.forfait_id) };
      if (form.agence_id) payload.agence_id = Number(form.agence_id);
      else delete payload.agence_id;
      const result = await (isAdmin ? api.admin.createPilgrim(payload) : api.agency.createPilgrim(payload));
      setShowCreate(false);
      setForm({ prenom: '', nom: '', email: '', telephone: '', mot_de_passe: '', saison_id: '', forfait_id: '', agence_id: '' });
      setNotice(t('pg_created', { number: result.numero_dossier }));
      setRefreshCount((count) => count + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || t('pg_createFailed'));
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-[18px] border border-[#dfe4ea] bg-[#f5f7f9] p-0 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#e5e7eb] bg-[#f6f7fb] px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-slate-700">{t('pg_title')}</h1>
            <p className="mt-3 text-[15px] text-slate-500">{t('pg_registered', { count: formatNumber(pilgrims.length) })}</p>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton label={t('pg_import')} icon="⇩" />
            <ActionButton label={t('pg_export')} icon="⇪" />
            {<PrimaryButton label={t('pg_new')} icon="＋" onClick={() => { setError(''); setNotice(''); setForm((current) => ({ ...current, saison_id: String(seasons[0]?.id || ''), forfait_id: '', agence_id: String(agencies[0]?.id || '') })); setShowCreate(true); }} />}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-3 rounded-[16px] border border-[#dfe5eb] bg-[#f7f8fa] p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-base text-slate-400">⌕</span>
            <input
              className="w-full rounded-xl border border-[#dfe3ea] bg-[#f2f3f7] py-3 ps-11 pe-4 text-[15px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('pg_searchPlaceholder')}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onChange={setStatusFilter} options={[['ALL', t('allStatus')], ...['brouillon', 'soumis', 'en_verification', 'valide', 'rejete'].map((status) => [status, t(`status_${status}`)])]} />
            <Select value={groupFilter} onChange={setGroupFilter} options={[["ALL", t('pg_allGroups')], ...groupOptions.map((group) => [group, group])]} />
            <Select value={packageFilter} onChange={setPackageFilter} options={[["ALL", t('pg_allPackages')], ...packages.map((item) => [String(item.id), item.nom])]} />
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <div className="mt-5 overflow-hidden rounded-[18px] border border-[#dfe3ea] bg-white">
          <div className="flex items-center justify-between border-b border-[#e7eaee] bg-[#fbfcfd] px-4 py-3 text-[14px] text-slate-500">
            <span>{loading ? t('pg_loading') : t('pg_found', { count: formatNumber(visiblePilgrims.length) })}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-start">
              <thead>
                <tr className="bg-[#f8fafb] text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-12 px-3 py-4">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                  <th className="px-3 py-4">{t('pg_colId')}</th>
                  <th className="px-3 py-4">{t('pg_colPilgrim')}</th>
                  <th className="px-3 py-4">{t('pg_colPhone')}</th>
                  <th className="px-3 py-4">{t('pg_colPackage')}</th>
                  <th className="px-3 py-4">{t('pg_colGroup')}</th>
                  <th className="px-3 py-4">{t('pg_colStatus')}</th>
                  <th className="px-3 py-4">{t('pg_colProgress')}</th>
                  <th className="px-3 py-4">{t('pg_colBalance')}</th>
                  <th className="px-3 py-4">{t('pg_colVisa')}</th>
                </tr>
              </thead>

              <tbody>
                {visiblePilgrims.map((person, index) => (
                  <tr key={`${person.id}-${index}`} className="border-t border-[#edf0f3] odd:bg-white even:bg-[#fbfcfd]">
                    <td className="px-3 py-4">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    </td>
                    <td className="px-3 py-4 align-middle text-[12px] font-medium text-slate-500">
                      <div className="leading-tight">
                        <div>{person.id}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold ${person.avatarTone}`}>
                          {person.avatar}
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-slate-700">{person.prenom} {person.nom}</div>
                          <div className="text-[12px] text-slate-500">{person.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[14px] text-slate-600">{person.telephone}</td>
                    <td className="px-3 py-4 text-[14px] text-slate-600">{person.forfait}</td>
                    <td className="px-3 py-4">
                      <div className="text-[14px] text-slate-600">{person.groupe}</div>
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={person.dossier} />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-[120px] overflow-hidden rounded-full bg-[#edf1f5]">
                          <div className="h-full rounded-full bg-[#4fbf8b]" style={{ width: `${person.completion}%` }} />
                        </div>
                        <span className="text-[14px] font-medium text-slate-600">{person.completion}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-[14px] font-medium text-slate-600">{formatNumber(person.solde)} {t('ad_currency')}</td>
                    <td className="px-3 py-4">
                      <VisaBadge status={person.visa} />
                    </td>
                  </tr>
                ))}
                {!loading && visiblePilgrims.length === 0 && <tr><td colSpan="10" className="px-4 py-10 text-center text-sm text-slate-500">{t('pg_noMatch')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showCreate && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
        <form onSubmit={createPilgrim} className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
          <header><h2 className="text-xl font-semibold text-slate-900">{t('pg_createTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('pg_createSub')}</p></header>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t('pg_fFirst')}><input required maxLength="100" autoComplete="given-name" value={form.prenom} onChange={(event) => setForm((current) => ({ ...current, prenom: event.target.value }))} className="field" /></FormField>
            <FormField label={t('pg_fLast')}><input required maxLength="100" autoComplete="family-name" value={form.nom} onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))} className="field" /></FormField>
            <FormField label={t('pg_fEmail')}><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="field" /></FormField>
            <FormField label={t('pg_fPhone')}><input type="tel" maxLength="20" autoComplete="tel" value={form.telephone} onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))} className="field" /></FormField>
            <FormField label={t('pg_fTempPassword')}><input required type="password" minLength="8" autoComplete="new-password" value={form.mot_de_passe} onChange={(event) => setForm((current) => ({ ...current, mot_de_passe: event.target.value }))} className="field" /></FormField>
            <FormField label={t('pg_fSeason')}><select required value={form.saison_id} onChange={(event) => { const nextSeason = event.target.value; const nextPackage = packages.find((item) => String(item.saison_id) === nextSeason); setForm((current) => ({ ...current, saison_id: nextSeason, forfait_id: nextPackage ? String(nextPackage.id) : '' })); }} className="field"><option value="">{t('pg_fSeasonChoose')}</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.libelle || `Hajj ${season.annee}`}</option>)}</select></FormField>
            <FormField label={t('pg_fPackage')}><select required value={form.forfait_id} onChange={(event) => setForm((current) => ({ ...current, forfait_id: event.target.value }))} className="field"><option value="">{t('pg_fPackageChoose')}</option>{seasonPackages.map((item) => <option key={item.id} value={item.id}>{item.nom} · {formatNumber(item.prix)} {item.devise}</option>)}</select></FormField>
            {isAdmin && <FormField label={t('pg_fOrg')}><select value={form.agence_id} onChange={(event) => setForm((current) => ({ ...current, agence_id: event.target.value }))} className="field"><option value="">{t('pg_fOrgNone')}</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></FormField>}
          </div>
          {!seasons.length && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t('pg_needSeason')}</p>}
          {seasons.length > 0 && !seasonPackages.length && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t('pg_noPackageSeason')}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button><button type="submit" disabled={saving || !seasonPackages.length} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_creating') : t('pg_submit')}</button></div>
        </form>
      </div>}
      <style>{`.field{display:block;width:100%;margin-top:.375rem;border:1px solid #dbe2e8;border-radius:.625rem;background:#fff;padding:.625rem .75rem;font-size:.875rem;color:#334155;outline:none}.field:focus{border-color:#14845d;box-shadow:0 0 0 2px rgba(20,132,93,.15)}`}</style>
    </section>
  );
}

function ActionButton({ label, icon }) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe3ea] bg-[#f7f8fa] px-4 py-2.5 text-[14px] font-medium text-slate-600 shadow-sm transition hover:bg-[#eef2f7]">
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </button>
  );
}

function PrimaryButton({ label, icon, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-[#0d8a6f] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(13,138,111,0.23)] transition hover:bg-[#0b7f66]">
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe3ea] bg-[#f2f3f7] px-3 text-[14px] text-slate-500 shadow-sm">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>
  );
}

function FormField({ label, children }) {
  return <label className="block text-xs font-medium text-slate-600">{label}{children}</label>;
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const tone = ['valide', 'transmis_nusuk', 'confirme'].includes(status) ? 'bg-[#d9f5ea] text-[#1d8a66]' : ['soumis', 'en_verification'].includes(status) ? 'bg-[#dfebff] text-[#3f67d6]' : 'bg-[#ffe3d9] text-[#d86046]';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${tone}`}>{t(`status_${status}`)}</span>;
}

const VISA_LABEL_KEYS = { APPROVED: 'pg_visaApproved', UNDER_REVIEW: 'pg_visaInProgress', REJECTED: 'pg_visaRejected' };

function VisaBadge({ status }) {
  const { t } = useLanguage();
  const tone = status === 'APPROVED' ? 'bg-[#ebf7ef] text-[#2e9f6a]' : status === 'UNDER_REVIEW' ? 'bg-[#e7f0ff] text-[#466ddb]' : 'bg-[#fff1d8] text-[#d29a1a]';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${tone}`}>{t(VISA_LABEL_KEYS[status] ?? 'pg_visaPending')}</span>;
}
