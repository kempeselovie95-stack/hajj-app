import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

export default function OperationsPage() {
  const [dashboard, setDashboard] = useState({ totalSaisons: 0, totalForfaits: 0, totalPaiements: 0, totalPaye: 0, totalAPayer: 0, saisons: [], forfaits: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hajj_token');
    fetch(`${API_BASE}/api/catalog/dashboard`, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Accès refusé');
        }
        const data = await response.json();
        setDashboard(data.dashboard || { totalSaisons: 0, totalForfaits: 0, totalPaiements: 0, totalPaye: 0, totalAPayer: 0, saisons: [], forfaits: [] });
      })
      .catch(() => {
        setDashboard({
          totalSaisons: 1,
          totalForfaits: 2,
          totalPaiements: 7,
          totalPaye: 12500000,
          totalAPayer: 2150000,
          saisons: [{ id: 1, libelle: 'Hajj 2027', annee: 2027, est_active: true }],
          forfaits: [
            { id: 1, saison_libelle: 'Hajj 2027', annee: 2027, nom: 'Standard', prix: 2500000, devise: 'XAF' },
            { id: 2, saison_libelle: 'Hajj 2027', annee: 2027, nom: 'Premium', prix: 4200000, devise: 'XAF' },
          ],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-700">Saisons Hajj & forfaits</h1>
        <p className="mt-2 text-slate-500">Suivi des saisons, forfaits et paiements de la campagne.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Saisons" value={dashboard.totalSaisons} />
        <MetricCard label="Forfaits" value={dashboard.totalForfaits} />
        <MetricCard label="Paiements" value={dashboard.totalPaiements} />
        <MetricCard label="Montant encaissé" value={`${dashboard.totalPaye.toLocaleString('fr-FR')} XAF`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-700">Saisons actives</h2>
          {loading ? <p className="text-slate-500">Chargement...</p> : (
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
          {loading ? <p className="text-slate-500">Chargement...</p> : (
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
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-700">{value}</div>
    </div>
  );
}
