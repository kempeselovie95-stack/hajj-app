import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function EncadreursPage() {
  const { api } = useAuth();
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = () => api.admin.listEncadreurs().then((data) => setEncadreurs(data.encadreurs ?? []));
  useEffect(() => { reload().catch(() => setEncadreurs([])).finally(() => setLoading(false)); }, [api]);
  return <section className="space-y-6"><header><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Administration</p><h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">Encadreurs</h1><p className="mt-1 text-text-secondary">Manage assignments and monitor each pilgrim group.</p></header><div className="card overflow-hidden !p-0">{loading ? <p className="p-6 text-text-secondary">Loading...</p> : encadreurs.length === 0 ? <p className="p-6 text-text-secondary">No encadreur account yet.</p> : <table className="w-full text-left"><thead className="border-b border-border bg-surface-muted"><tr><Th>Name</Th><Th>Agency</Th><Th>Groups</Th><Th>Pilgrims</Th><Th>Actions</Th></tr></thead><tbody className="divide-y divide-border">{encadreurs.map((item) => <tr key={item.id}><td className="px-4 py-4 font-medium text-text-primary">{item.prenom} {item.nom}</td><td className="px-4 py-4 text-sm text-text-secondary">{item.nom_agence}</td><td className="px-4 py-4 font-mono text-sm text-text-secondary">{item.total_groupes}</td><td className="px-4 py-4 font-mono text-sm text-text-secondary">{item.total_pelerins}</td><td className="px-4 py-4"><button onClick={async () => { if (!window.confirm(`Delete ${item.prenom} ${item.nom}?`)) return; await api.admin.deleteEncadreur(item.id); await reload(); }} className="text-sm font-semibold text-danger hover:underline">Delete</button></td></tr>)}</tbody></table>}</div></section>;
}
function Th({ children }) { return <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</th>; }
