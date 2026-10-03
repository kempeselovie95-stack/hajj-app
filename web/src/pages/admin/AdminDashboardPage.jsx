import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const STATUS_LABELS = {
  brouillon: 'Brouillons',
  soumis: 'Soumis',
  en_verification: 'En vérification',
  valide: 'Validés',
  transmis_nusuk: 'Transmis à Nusuk',
  confirme: 'Confirmés',
  rejete: 'Rejetés',
  annule: 'Annulés',
};
const STATUS_COLORS = ['#14845d', '#e7a72f', '#5174f2', '#0ea5e9', '#14b8a6', '#65a30d', '#ef4444', '#94a3b8'];
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const EMPTY_DASHBOARD = { saison: null, saisons: [], indicateurs: {}, statuts: [], evolution: [], activite: [] };

export default function AdminDashboardPage() {
  const { api } = useAuth();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [selectedYear, setSelectedYear] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.admin.dashboard(selectedYear || undefined)
      .then(({ dashboard: data }) => {
        if (!active) return;
        setDashboard(data ?? EMPTY_DASHBOARD);
        setSelectedYear((current) => current || String(data?.saison?.annee ?? ''));
        setUpdatedAt(new Date());
      })
      .catch(() => {
        if (active) setError('Impossible de charger les données du tableau de bord. Vérifie la connexion au serveur.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, selectedYear, refreshCount]);

  const metrics = dashboard.indicateurs ?? {};
  const totalDossiers = Number(metrics.total_dossiers || 0);
  const validatedDossiers = Number(metrics.dossiers_valides || 0);
  const validatedPercent = totalDossiers ? Math.round((validatedDossiers / totalDossiers) * 100) : 0;
  const filteredActivity = dashboard.activite.filter((item) => activityFilter === 'all' || item.type === activityFilter);

  return (
    <div className="space-y-5 pb-8 text-slate-800">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight text-slate-900">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vue d’ensemble opérationnelle{updatedAt ? ` · mise à jour à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-700" />
            <span className="sr-only">Saison Hajj</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="max-w-36 bg-transparent outline-none">
              {dashboard.saisons.length === 0 && <option value={selectedYear}>{dashboard.saison?.libelle || 'Saison courante'}</option>}
              {dashboard.saisons.map((season) => <option key={season.id} value={season.annee}>{season.libelle || `Hajj ${season.annee}`}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setRefreshCount((count) => count + 1)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 transition hover:bg-slate-50" disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></svg>
            Actualiser
          </button>
          <button type="button" onClick={() => exportDashboard(dashboard)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 transition hover:bg-slate-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" /></svg>
            Exporter
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section aria-label="Indicateurs de la saison" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard className="sm:col-span-2" label="Pèlerins inscrits" value={formatNumber(metrics.total_pelerins)} detail={dashboard.saison?.libelle || `Hajj ${selectedYear || '—'}`} tone="green" icon="people" loading={loading} />
        <MetricCard label="Dossiers validés" value={formatNumber(validatedDossiers)} detail={`${validatedPercent}% des dossiers de la saison`} tone="plain" icon="check" loading={loading} />
        <MetricCard label="Documents rejetés" value={formatNumber(metrics.documents_rejetes)} detail={`${formatNumber(metrics.documents_a_verifier)} à vérifier`} tone="red" icon="alert" loading={loading} />
        <MetricCard label="Paiements reçus" value={formatCurrency(metrics.paiements_recus)} detail="Total des paiements validés" tone="plain" icon="wallet" loading={loading} />
        <MetricCard label="Solde restant" value={formatCurrency(metrics.solde_restant)} detail={`${formatNumber(metrics.pelerins_avec_solde)} pèlerins avec un solde`} tone="yellow" icon="alert" loading={loading} />
        <MetricCard label="Dossiers enregistrés" value={formatNumber(totalDossiers)} detail="Pour la saison sélectionnée" tone="plain" icon="documents" loading={loading} />
        <MetricCard label="Groupes formés" value={formatNumber(metrics.groupes_formes)} detail={`${formatNumber(metrics.groupes_sans_guide)} sans guide assigné`} tone="plain" icon="people" loading={loading} />
        <MetricCard label="Guides actifs" value={formatNumber(metrics.guides_actifs)} detail="Comptes actifs enregistrés" tone="plain" icon="guide" loading={loading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)]">
        <Panel title="Évolution des inscriptions" subtitle={`Opérations de l’année en cours · ${dashboard.saison?.libelle ?? `Hajj ${selectedYear || '—'}`}`} action={<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Données mensuelles</span>}>
          <ActivityChart rows={dashboard.evolution} loading={loading} />
        </Panel>
        <Panel title="Statut des dossiers" subtitle={`${formatNumber(totalDossiers)} dossiers de la saison`}>
          <StatusBreakdown rows={dashboard.statuts} loading={loading} />
        </Panel>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)]">
        <Panel title="Activité récente" subtitle="Dernières opérations enregistrées" action={<label className="sr-only">Filtrer les activités</label>}>
          <select aria-label="Filtrer les activités" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)} className="absolute right-5 top-5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="all">Tout</option><option value="dossier">Dossiers</option><option value="paiement">Paiements</option><option value="document">Documents</option>
          </select>
          <ActivityList items={filteredActivity} loading={loading} />
        </Panel>
        <div className="space-y-4">
          <Alerts metrics={metrics} loading={loading} />
          <QuickActions />
          <SeasonProgress metrics={metrics} validatedPercent={validatedPercent} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, tone, icon, loading, className = '' }) {
  const tones = {
    green: 'border-[#17734f] bg-[#17734f] text-white',
    plain: 'border-slate-200 bg-white text-slate-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    yellow: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  const iconTones = { green: 'bg-white/15 text-white', plain: 'bg-slate-100 text-emerald-700', red: 'bg-red-100 text-red-600', yellow: 'bg-amber-100 text-amber-700' };
  return (
    <article className={`min-h-[154px] rounded-2xl border p-5 ${tones[tone]} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${tone === 'green' ? 'text-white/80' : tone === 'red' ? 'text-red-700' : tone === 'yellow' ? 'text-amber-800' : 'text-slate-500'}`}>{label}</p>
          <p className="mt-2 truncate text-[30px] font-semibold leading-none tabular-nums">{loading ? '—' : value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTones[tone]}`}><MetricIcon name={icon} /></span>
      </div>
      <p className={`mt-3 border-t pt-3 text-xs ${tone === 'green' ? 'border-white/20 text-white/75' : 'border-slate-200 text-slate-500'}`}>{detail}</p>
    </article>
  );
}

function MetricIcon({ name }) {
  const shared = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, className: 'h-5 w-5', 'aria-hidden': true };
  if (name === 'people') return <svg {...shared}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0-1-5.8M17 14a5 5 0 0 1 3.5 4.8" /></svg>;
  if (name === 'check') return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  if (name === 'alert') return <svg {...shared}><path d="M10.3 4.5 2.9 17.3A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.7L13.7 4.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></svg>;
  if (name === 'wallet') return <svg {...shared}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18m-5 5h2" /><path d="M6 5V3h12v2" /></svg>;
  if (name === 'documents') return <svg {...shared}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6m-11 4h6m-6 4h6" /></svg>;
  return <svg {...shared}><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0m-2-14 1.2 1.2L21 4" /></svg>;
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="relative min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex min-h-10 items-start justify-between gap-4 pr-32">
        <div><h2 className="text-[15px] font-semibold text-slate-800">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div>
        {action && <div className="absolute right-5 top-5">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function ActivityChart({ rows, loading }) {
  if (loading) return <div className="h-56 animate-pulse rounded-lg bg-slate-50" />;
  const points = Array.from({ length: 12 }, (_, index) => {
    const row = rows.find((item) => Number(item.month) === index + 1) ?? {};
    return { inscriptions: Number(row.inscriptions || 0), documents: Number(row.documents || 0), paiements: Number(row.paiements || 0) };
  });
  const max = Math.max(1, ...points.flatMap((point) => [point.inscriptions, point.documents, point.paiements]));
  const chartHeight = 142;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
        <Legend color="#17734f" label="Inscriptions" /><Legend color="#e7a72f" label="Documents" /><Legend color="#5174f2" label="Paiements" />
      </div>
      <svg viewBox="0 0 640 190" className="h-56 w-full overflow-visible" role="img" aria-label="Évolution mensuelle des inscriptions, documents et paiements">
        {[0, 1, 2, 3].map((line) => <line key={line} x1="28" x2="632" y1={15 + line * 42} y2={15 + line * 42} stroke="#e8edf1" strokeDasharray="3 5" />)}
        {points.map((point, index) => {
          const x = 40 + index * 50;
          const values = [point.inscriptions, point.documents, point.paiements];
          return <g key={index}>{values.map((value, series) => {
            const height = value ? Math.max(3, (value / max) * chartHeight) : 0;
            return <rect key={series} x={x + series * 11} y={157 - height} width="8" height={height} rx="3" fill={['#17734f', '#e7a72f', '#5174f2'][series]} />;
          })}<text x={x + 10} y="179" textAnchor="middle" className="fill-slate-400 text-[9px]">{MONTHS[index]}</text></g>;
        })}
      </svg>
      {!rows.length && <p className="-mt-7 text-center text-xs text-slate-400">Aucune activité enregistrée pour cette période.</p>}
    </div>
  );
}

function Legend({ color, label }) {
  return <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3" style={{ backgroundColor: color }} />{label}</span>;
}

function StatusBreakdown({ rows, loading }) {
  const total = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  let offset = 0;
  const gradient = rows.map((row, index) => {
    const start = offset;
    offset += total ? Number(row.total || 0) / total * 100 : 0;
    return `${STATUS_COLORS[index % STATUS_COLORS.length]} ${start}% ${offset}%`;
  }).join(', ');
  if (loading) return <div className="h-56 animate-pulse rounded-lg bg-slate-50" />;
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center gap-5 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${gradient})` : '#e8edf1' }}>
        <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-semibold tabular-nums text-slate-800">{total}</span><span className="text-[10px] text-slate-400">dossiers</span></div>
      </div>
      <ul className="w-full space-y-2">
        {rows.map((row, index) => <li key={row.statut} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 truncate text-slate-500"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />{STATUS_LABELS[row.statut] || row.statut}</span><span className="font-medium tabular-nums text-slate-800">{row.total}</span></li>)}
        {!rows.length && <li className="text-center text-xs text-slate-400">Aucun dossier enregistré.</li>}
      </ul>
    </div>
  );
}

function ActivityList({ items, loading }) {
  if (loading) return <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-[68px] animate-pulse rounded-lg bg-slate-50" />)}</div>;
  if (!items.length) return <p className="py-12 text-center text-sm text-slate-400">Aucune activité pour ce filtre.</p>;
  return <ul className="divide-y divide-slate-100">{items.map((item, index) => <li key={`${item.type}-${item.reference}-${item.cree_le}-${index}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.type === 'paiement' ? 'bg-blue-50 text-blue-600' : item.type === 'document' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><MetricIcon name={item.type === 'paiement' ? 'wallet' : item.type === 'document' ? 'documents' : 'check'} /></span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-x-3"><p className="truncate text-sm font-medium text-slate-800">{item.acteur || 'Système'}</p><time className="text-[11px] text-slate-400">{formatDate(item.cree_le)}</time></div><p className="mt-0.5 text-xs text-slate-500">{item.reference} · {item.description}</p>{item.montant != null && <p className="mt-1 text-xs font-medium text-emerald-700">{formatCurrency(item.montant)}</p>}</div>
  </li>)}</ul>;
}

function Alerts({ metrics, loading }) {
  const alerts = [
    { count: Number(metrics.documents_rejetes || 0), text: 'documents rejetés', tone: 'red' },
    { count: Number(metrics.pelerins_avec_solde || 0), text: 'pèlerins avec un solde restant', tone: 'amber' },
    { count: Number(metrics.groupes_sans_guide || 0), text: 'groupes sans guide assigné', tone: 'amber' },
  ].filter((alert) => alert.count > 0);
  return <Panel title="Alertes opérationnelles" subtitle="Points nécessitant un suivi">
    {loading ? <div className="h-24 animate-pulse rounded-lg bg-slate-50" /> : alerts.length ? <ul className="space-y-2">{alerts.map((alert) => <li key={alert.text} className={`rounded-xl border px-3 py-2.5 text-xs ${alert.tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><span className="font-semibold tabular-nums">{alert.count}</span> {alert.text}</li>)}</ul> : <p className="rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-800">Aucune alerte opérationnelle.</p>}
  </Panel>;
}

function QuickActions() {
  const actions = [
    { title: 'Ajouter un pèlerin', detail: 'Consulter la liste des pèlerins', to: '/admin/pelerins', icon: 'people', color: 'text-emerald-700 bg-emerald-50' },
    { title: 'Valider des documents', detail: 'Voir les dossiers à traiter', to: '/admin/dossiers', icon: 'documents', color: 'text-violet-700 bg-violet-50' },
    { title: 'Enregistrer un paiement', detail: 'Suivre les encaissements', to: '/admin/paiements', icon: 'wallet', color: 'text-blue-700 bg-blue-50' },
    { title: 'Envoyer une notification', detail: 'Ouvrir la messagerie', to: '/admin/notifications', icon: 'guide', color: 'text-rose-700 bg-rose-50' },
  ];
  return <Panel title="Actions rapides" subtitle="Accès aux opérations courantes"><ul className="space-y-1">{actions.map((action) => <li key={action.to}><Link to={action.to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.color}`}><MetricIcon name={action.icon} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-800">{action.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{action.detail}</span></span><span className="text-slate-400">→</span></Link></li>)}</ul></Panel>;
}

function SeasonProgress({ metrics, validatedPercent }) {
  const documentsTotal = Number(metrics.documents_valides || 0) + Number(metrics.documents_rejetes || 0) + Number(metrics.documents_a_verifier || 0);
  const totalGroups = Number(metrics.groupes_formes || 0);
  const paymentPercent = Number(metrics.paiements_recus || 0) + Number(metrics.solde_restant || 0)
    ? Math.round(Number(metrics.paiements_recus || 0) / (Number(metrics.paiements_recus || 0) + Number(metrics.solde_restant || 0)) * 100)
    : 0;
  const progress = [
    { label: 'Dossiers validés', value: validatedPercent, color: 'bg-emerald-700' },
    { label: 'Documents approuvés', value: documentsTotal ? Math.round((Number(metrics.documents_valides || 0) / documentsTotal) * 100) : 0, color: 'bg-sky-500' },
    { label: 'Paiements encaissés', value: paymentPercent, color: 'bg-blue-500' },
    { label: 'Groupes avec guide', value: totalGroups ? Math.round(((totalGroups - Number(metrics.groupes_sans_guide || 0)) / totalGroups) * 100) : 0, color: 'bg-teal-500' },
  ];
  return <Panel title="Préparation de la saison" subtitle="Progression calculée sur les données disponibles"><div className="space-y-4">{progress.map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-500">{item.label}</span><span className="font-medium tabular-nums text-slate-700">{item.value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} /></div></div>)}</div></Panel>;
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatCurrency(value) {
  return `${formatNumber(value)} FCFA`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function exportDashboard(dashboard) {
  const metrics = dashboard.indicateurs || {};
  const rows = [
    ['Indicateur', 'Valeur'],
    ['Saison', dashboard.saison?.libelle || dashboard.saison?.annee || ''],
    ['Pèlerins inscrits', metrics.total_pelerins || 0],
    ['Dossiers', metrics.total_dossiers || 0],
    ['Dossiers validés', metrics.dossiers_valides || 0],
    ['Documents rejetés', metrics.documents_rejetes || 0],
    ['Paiements reçus (FCFA)', metrics.paiements_recus || 0],
    ['Solde restant (FCFA)', metrics.solde_restant || 0],
    ['Groupes formés', metrics.groupes_formes || 0],
    ...dashboard.activite.map((activity) => [`${activity.type} · ${activity.reference}`, `${activity.description} · ${activity.acteur || 'Système'} · ${formatDate(activity.cree_le)}`]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `myhajj237-dashboard-${dashboard.saison?.annee || 'export'}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}