import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const EMPTY_DASHBOARD = { totalSaisons: 0, totalForfaits: 0, totalPaiements: 0, totalPaye: 0, totalAPayer: 0, saisons: [], forfaits: [] };

export default function OperationsPage() {
  const { api } = useAuth();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [seasonForm, setSeasonForm] = useState({ libelle: '', annee: String(new Date().getFullYear() + 1), date_debut: '', date_fin: '', description: '', est_active: true });
  const [packageForm, setPackageForm] = useState({ saison_id: '', nom: '', description: '', prix: '', devise: 'XAF', inclus: '', est_actif: true });

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.catalog.dashboard()
      .then((data) => { if (active) { setDashboard(data.dashboard || EMPTY_DASHBOARD); setError(''); } })
      .catch(() => { if (active) { setDashboard(EMPTY_DASHBOARD); setError('Impossible de charger les données de saison et forfaits.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, refreshCount]);

  async function submitSeason(event) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await api.catalog.createSeason({ ...seasonForm, annee: Number(seasonForm.annee), date_debut: seasonForm.date_debut || null, date_fin: seasonForm.date_fin || null });
      setDialog(null); setNotice('Saison enregistrée.'); setRefreshCount((count) => count + 1);
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || 'La saison n’a pas pu être enregistrée.'); }
    finally { setSaving(false); }
  }

  async function submitPackage(event) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      await api.catalog.createPackage({ ...packageForm, saison_id: Number(packageForm.saison_id), prix: Number(packageForm.prix) });
      setDialog(null); setNotice('Forfait enregistré.'); setRefreshCount((count) => count + 1);
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.response?.data?.erreurs?.[0]?.msg || 'Le forfait n’a pas pu être enregistré.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-semibold text-slate-700">Saisons Hajj & forfaits</h1><p className="mt-2 text-slate-500">Suivi des saisons, forfaits et paiements de la campagne.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => { setError(''); setDialog('season'); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">+ Nouvelle saison</button><button type="button" onClick={() => { setError(''); setPackageForm((current) => ({ ...current, saison_id: String(dashboard.saisons.find((season) => season.est_active)?.id || dashboard.saisons[0]?.id || '') })); setDialog('package'); }} disabled={!dashboard.saisons.length} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">+ Nouveau forfait</button></div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Saisons" value={dashboard.totalSaisons} />
        <MetricCard label="Forfaits" value={dashboard.totalForfaits} />
        <MetricCard label="Paiements" value={dashboard.totalPaiements} />
        <MetricCard label="Montant encaissé" value={`${dashboard.totalPaye.toLocaleString('fr-FR')} XAF`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-700">Saisons actives</h2>
          {loading ? <p className="text-slate-500">Chargement...</p> : dashboard.saisons.length === 0 ? <p className="text-sm text-slate-500">Aucune saison enregistrée.</p> : (
            <div className="space-y-3">
              {(dashboard.saisons || []).map((saison) => (
                <div key={saison.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <div className="font-semibold text-slate-700">{saison.libelle || `Hajj ${saison.annee}`}</div>
                    <div className="text-sm text-slate-500">{saison.annee} · {saison.est_active ? 'Active' : 'Inactive'}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${saison.est_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {saison.est_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-700">Forfaits</h2>
          {loading ? <p className="text-slate-500">Chargement...</p> : dashboard.forfaits.length === 0 ? <p className="text-sm text-slate-500">Aucun forfait enregistré.</p> : (
            <div className="space-y-3">
              {(dashboard.forfaits || []).map((forfait) => (
                <div key={forfait.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-700">{forfait.nom}</div>
                    <span className="text-sm text-slate-500">{forfait.annee}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{forfait.saison_libelle || 'Saison Hajj'}</div>
                  <div className="mt-2 text-lg font-semibold text-emerald-700">
                    {Number(forfait.prix || 0).toLocaleString('fr-FR')} {forfait.devise || 'XAF'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {dialog && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        {dialog === 'season' ? <form onSubmit={submitSeason} className="w-full space-y-4 rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
          <div><h2 className="text-xl font-semibold text-slate-900">Créer une saison Hajj</h2><p className="mt-1 text-sm text-slate-500">Définis la campagne et son calendrier.</p></div>
          <Field label="Libellé"><input required value={seasonForm.libelle} onChange={(event) => setSeasonForm((current) => ({ ...current, libelle: event.target.value }))} className="field" placeholder="Hajj 2028" /></Field>
          <Field label="Année"><input required type="number" min="2025" max="2100" value={seasonForm.annee} onChange={(event) => setSeasonForm((current) => ({ ...current, annee: event.target.value }))} className="field" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Date de début"><input type="date" value={seasonForm.date_debut} onChange={(event) => setSeasonForm((current) => ({ ...current, date_debut: event.target.value }))} className="field" /></Field><Field label="Date de fin"><input type="date" value={seasonForm.date_fin} onChange={(event) => setSeasonForm((current) => ({ ...current, date_fin: event.target.value }))} className="field" /></Field></div>
          <Field label="Description"><textarea rows="2" maxLength="2000" value={seasonForm.description} onChange={(event) => setSeasonForm((current) => ({ ...current, description: event.target.value }))} className="field" /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={seasonForm.est_active} onChange={(event) => setSeasonForm((current) => ({ ...current, est_active: event.target.checked }))} />Saison active</label>
          <DialogActions saving={saving} onCancel={() => setDialog(null)} />
        </form> : <form onSubmit={submitPackage} className="w-full space-y-4 rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
          <div><h2 className="text-xl font-semibold text-slate-900">Créer un forfait</h2><p className="mt-1 text-sm text-slate-500">Associe le tarif à une saison existante.</p></div>
          <Field label="Saison"><select required value={packageForm.saison_id} onChange={(event) => setPackageForm((current) => ({ ...current, saison_id: event.target.value }))} className="field">{dashboard.saisons.map((season) => <option key={season.id} value={season.id}>{season.libelle || `Hajj ${season.annee}`}</option>)}</select></Field>
          <Field label="Nom"><input required maxLength="120" value={packageForm.nom} onChange={(event) => setPackageForm((current) => ({ ...current, nom: event.target.value }))} className="field" placeholder="Standard" /></Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]"><Field label="Prix"><input required type="number" min="0" step="1" value={packageForm.prix} onChange={(event) => setPackageForm((current) => ({ ...current, prix: event.target.value }))} className="field" /></Field><Field label="Devise"><input required maxLength="10" value={packageForm.devise} onChange={(event) => setPackageForm((current) => ({ ...current, devise: event.target.value.toUpperCase() }))} className="field" /></Field></div>
          <Field label="Description"><textarea rows="2" maxLength="2000" value={packageForm.description} onChange={(event) => setPackageForm((current) => ({ ...current, description: event.target.value }))} className="field" /></Field>
          <Field label="Prestations incluses"><textarea rows="2" maxLength="2000" value={packageForm.inclus} onChange={(event) => setPackageForm((current) => ({ ...current, inclus: event.target.value }))} className="field" /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={packageForm.est_actif} onChange={(event) => setPackageForm((current) => ({ ...current, est_actif: event.target.checked }))} />Forfait actif</label>
          <DialogActions saving={saving} onCancel={() => setDialog(null)} />
        </form>}
      </div>}
      <style>{`.field{display:block;width:100%;margin-top:.375rem;border:1px solid #dbe2e8;border-radius:.625rem;background:#fff;padding:.625rem .75rem;font-size:.875rem;color:#334155;outline:none}.field:focus{border-color:#14845d;box-shadow:0 0 0 2px rgba(20,132,93,.15)}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-xs font-medium text-slate-600">{label}{children}</label>;
}

function DialogActions({ saving, onCancel }) {
  return <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Annuler</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Créer'}</button></div>;
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-700">{value}</div>
    </div>
  );
}
