import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ORGANISATION_STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING', 'ARCHIVED'];
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED'];
const EMPTY_ORGANISATION = {
  name: '', legal_name: '', registration_number: '', country: 'Cameroun', city: '', address: '',
  phone: '', email: '', logo: '', status: 'ACTIVE', subscription_plan: 'STARTER', subscription_status: 'TRIAL',
};

export default function OrganisationsPage() {
  const { api } = useAuth();
  const [organisations, setOrganisations] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ORGANISATION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function reload() {
    const response = await api.admin.listAgencies();
    setOrganisations(response.agences ?? []);
  }

  useEffect(() => {
    let active = true;
    api.admin.listAgencies()
      .then((response) => { if (active) setOrganisations(response.agences ?? []); })
      .catch(() => { if (active) setError('Impossible de charger les organisations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api]);

  const filtered = useMemo(() => organisations.filter((organisation) => {
    const matchesStatus = statusFilter === 'ALL' || organisation.status === statusFilter;
    const term = search.trim().toLocaleLowerCase('fr');
    const matchesSearch = !term || [organisation.name, organisation.legal_name, organisation.city, organisation.email, organisation.registration_number]
      .some((value) => value?.toLocaleLowerCase('fr').includes(term));
    return matchesStatus && matchesSearch;
  }), [organisations, search, statusFilter]);

  function openEditor(organisation) {
    setEditing(organisation);
    setForm({ ...EMPTY_ORGANISATION, ...organisation });
    setError('');
    setNotice('');
  }

  async function saveOrganisation(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await api.admin.updateOrganisation(editing.id, form);
      await reload();
      setEditing(null);
      setNotice('Organisation mise à jour.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || 'La mise à jour a échoué.');
    } finally { setSaving(false); }
  }

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Administration</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Organisations</h1><p className="mt-2 text-sm text-slate-500">Chaque agence est gérée comme une organisation MyHajj237.</p></div>
        <span className="w-fit rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">{organisations.length} organisation{organisations.length === 1 ? '' : 's'}</span>
      </header>

      {error && !editing && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row">
        <label className="min-w-0 flex-1"><span className="sr-only">Rechercher une organisation</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, ville, email, numéro d’agrément…" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
        <label><span className="sr-only">Filtrer par statut</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 sm:w-44"><option value="ALL">Tous les statuts</option>{ORGANISATION_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-6 text-sm text-slate-500">Chargement des organisations…</p> : !filtered.length ? <p className="p-8 text-center text-sm text-slate-500">Aucune organisation ne correspond à la recherche.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Organisation</th><th className="px-4 py-3 font-medium">Enregistrement</th><th className="px-4 py-3 font-medium">Contact</th><th className="px-4 py-3 font-medium">Abonnement</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filtered.map((organisation) => <tr key={organisation.id}>
              <td className="px-4 py-4"><div className="font-medium text-slate-800">{organisation.name}</div><div className="mt-1 text-xs text-slate-500">{organisation.legal_name || organisation.name}</div></td>
              <td className="px-4 py-4"><div className="text-slate-700">{[organisation.city, organisation.country].filter(Boolean).join(', ')}</div><div className="mt-1 text-xs text-slate-500">{organisation.registration_number || 'Agrément non renseigné'}</div></td>
              <td className="px-4 py-4"><div className="text-slate-700">{organisation.email || '—'}</div><div className="mt-1 text-xs text-slate-500">{organisation.phone || 'Téléphone non renseigné'}</div></td>
              <td className="px-4 py-4"><div className="text-slate-700">{organisation.subscription_plan || 'STARTER'}</div><div className="mt-1 text-xs text-slate-500">{subscriptionLabel(organisation.subscription_status)}</div></td>
              <td className="px-4 py-4"><StatusPill value={organisation.status} /></td>
              <td className="px-4 py-4 text-right"><button type="button" onClick={() => openEditor(organisation)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Modifier</button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>

      {editing && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
        <form onSubmit={saveOrganisation} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-slate-900">Modifier l’organisation</h2><p className="mt-1 text-sm text-slate-500">{editing.name}</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button></div>
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nom" name="name" form={form} setForm={setForm} required />
            <FormField label="Raison sociale" name="legal_name" form={form} setForm={setForm} />
            <FormField label="Numéro d’agrément" name="registration_number" form={form} setForm={setForm} />
            <FormField label="Pays" name="country" form={form} setForm={setForm} required />
            <FormField label="Ville" name="city" form={form} setForm={setForm} />
            <FormField label="Adresse" name="address" form={form} setForm={setForm} />
            <FormField label="Téléphone" name="phone" form={form} setForm={setForm} />
            <FormField label="Email" name="email" type="email" form={form} setForm={setForm} />
            <FormField label="URL du logo" name="logo" form={form} setForm={setForm} />
            <FormField label="Formule d’abonnement" name="subscription_plan" form={form} setForm={setForm} required />
            <SelectField label="Statut organisation" name="status" values={ORGANISATION_STATUSES} form={form} setForm={setForm} />
            <SelectField label="Statut abonnement" name="subscription_status" values={SUBSCRIPTION_STATUSES} form={form} setForm={setForm} />
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Annuler</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
        </form>
      </div>}
    </section>
  );
}

function FormField({ label, name, form, setForm, type = 'text', required = false }) {
  return <label className="block text-xs font-medium text-slate-600">{label}<input type={type} name={name} required={required} value={form[name] ?? ''} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>;
}

function SelectField({ label, name, values, form, setForm }) {
  return <label className="block text-xs font-medium text-slate-600">{label}<select name={name} value={form[name] ?? values[0]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-700">{values.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>;
}

function StatusPill({ value }) {
  const tone = value === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : value === 'SUSPENDED' || value === 'ARCHIVED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{statusLabel(value)}</span>;
}

function statusLabel(value) {
  return ({ ACTIVE: 'Actif', SUSPENDED: 'Suspendu', PENDING: 'En attente', ARCHIVED: 'Archivé' })[value] || value || 'En attente';
}

function subscriptionLabel(value) {
  return ({ ACTIVE: 'Actif', TRIAL: 'Essai', PAST_DUE: 'Paiement en retard', CANCELLED: 'Résilié' })[value] || value || 'Essai';
}