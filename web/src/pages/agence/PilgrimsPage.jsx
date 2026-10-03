import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const FALLBACK_PILGRIMS = [
  { id: 'HAJJ-CM-2027-001', prenom: 'Aminatou', nom: 'Sali', telephone: '+237 677 123 456', forfait: 'Standard', groupe: 'CAM-2027-005', dossier: 'Brouillon', completion: 18, solde: '2500000', visa: 'En attente', avatar: 'AS', avatarTone: 'bg-[#8fbce6] text-white' },
  { id: 'HAJJ-CM-2027-002', prenom: 'Adamou', nom: 'Maroua', telephone: '+237 690 123 456', forfait: 'Standard', groupe: 'CAM-2027-003', dossier: 'Dossiers approuvés', completion: 78, solde: '5000000', visa: 'En cours', avatar: 'AM', avatarTone: 'bg-[#d1c0ef] text-white' },
  { id: 'HAJJ-CM-2027-003', prenom: 'Mamadou', nom: 'Sali', telephone: '+237 655 123 456', forfait: 'Standard', groupe: 'CAM-2027-005', dossier: 'Enregistré', completion: 35, solde: '2500000', visa: 'En attente', avatar: 'MS', avatarTone: 'bg-[#f1c08f] text-white' },
  { id: 'HAJJ-CM-2027-004', prenom: 'Amina', nom: 'Njoya', telephone: '+237 699 987 654', forfait: 'Premium', groupe: 'CAM-2027-011', dossier: 'Dossiers approuvés', completion: 85, solde: '7500000', visa: 'Validé', avatar: 'AN', avatarTone: 'bg-[#8ac9bf] text-white' },
  { id: 'HAJJ-CM-2027-005', prenom: 'Nadia', nom: 'Etsogo', telephone: '+237 650 435 884', forfait: 'Standard', groupe: 'CAM-2027-008', dossier: 'Brouillon', completion: 27, solde: '1800000', visa: 'En attente', avatar: 'NE', avatarTone: 'bg-[#f3d4e6] text-white' },
];

export default function PilgrimsPage() {
  const { api } = useAuth();
  const [dossiers, setDossiers] = useState(FALLBACK_PILGRIMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!api?.dossiers?.list) {
        setDossiers(FALLBACK_PILGRIMS);
        setLoading(false);
        return;
      }

      try {
        const response = await api.dossiers.list({ page: 1, limite: 100 });
        const list = response?.dossiers ?? FALLBACK_PILGRIMS;
        setDossiers(list.length ? list : FALLBACK_PILGRIMS);
      } catch (error) {
        setDossiers(FALLBACK_PILGRIMS);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api]);

  const pilgrims = useMemo(() => {
    if (!dossiers?.length) return [];

    return dossiers.map((dossier, index) => {
      const pelerin = dossier.pelerin ?? {};
      const [apiPrenom, ...apiNom] = (dossier.pelerin_nom ?? '').trim().split(/\s+/).filter(Boolean);
      const prenom = pelerin.prenom ?? dossier.prenom ?? apiPrenom ?? 'Pèlerin';
      const nom = pelerin.nom ?? dossier.nom ?? apiNom.join(' ') ?? 'Anonyme';
      const record = {
        id: dossier.numero_dossier ?? dossier.id ?? `P-${index + 1}`,
        prenom,
        nom,
        telephone: pelerin.telephone ?? dossier.telephone ?? '+237 000 000 000',
        forfait: dossier.forfait ?? 'Standard',
        groupe: dossier.groupe ?? `CAM-2027-${String(index + 1).padStart(3, '0')}`,
        dossier: dossier.statut ?? ['Brouillon', 'Dossiers approuvés', 'Enregistré'][index % 3],
        completion: dossier.completion ?? [18, 78, 35, 85, 27][index % 5],
        solde: dossier.solde ?? ['2500000', '5000000', '2500000', '7500000', '1800000'][index % 5],
        visa: dossier.visa ?? ['En attente', 'En cours', 'En attente', 'Validé', 'En attente'][index % 5],
        avatar: `${(pelerin.prenom ?? dossier.prenom ?? 'P').charAt(0)}${(pelerin.nom ?? dossier.nom ?? 'A').charAt(0)}`.toUpperCase(),
        avatarTone: ['bg-[#8fbce6] text-white', 'bg-[#d1c0ef] text-white', 'bg-[#f1c08f] text-white', 'bg-[#8ac9bf] text-white', 'bg-[#f3d4e6] text-white'][index % 5],
      };

      return record;
    });
  }, [dossiers]);

  return (
    <section className="rounded-[18px] border border-[#dfe4ea] bg-[#f5f7f9] p-0 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#e5e7eb] bg-[#f6f7fb] px-5 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-slate-700">Gestion des pèlerins</h1>
            <p className="mt-3 text-[15px] text-slate-500">
              347 pèlerins inscrits · Hajj 2027 · Mise à jour: 02/10/2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton label="Importer" icon="⇩" />
            <ActionButton label="Exporter" icon="⇪" />
            <PrimaryButton label="Nouvel" icon="＋" />
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-3 rounded-[16px] border border-[#dfe5eb] bg-[#f7f8fa] p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-slate-400">⌕</span>
            <input
              className="w-full rounded-xl border border-[#dfe3ea] bg-[#f2f3f7] py-3 pl-11 pr-4 text-[15px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              type="text"
              placeholder="Rechercher par nom, ID, téléphone, email..."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value="Tous les statuts" />
            <Select value="Tous les groupes" />
            <Select value="Tous les fo" />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[18px] border border-[#dfe3ea] bg-white">
          <div className="flex items-center justify-between border-b border-[#e7eaee] bg-[#fbfcfd] px-4 py-3 text-[14px] text-slate-500">
            <span>{loading ? 'Chargement...' : `${pilgrims.length} pèlerins trouvés`}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-[#f8fafb] text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-12 px-3 py-4">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                  <th className="px-3 py-4">ID</th>
                  <th className="px-3 py-4">Pèlerin</th>
                  <th className="px-3 py-4">Téléphone</th>
                  <th className="px-3 py-4">Forfait</th>
                  <th className="px-3 py-4">Groupe</th>
                  <th className="px-3 py-4">Statut dossier</th>
                  <th className="px-3 py-4">Complétion</th>
                  <th className="px-3 py-4">Solde</th>
                  <th className="px-3 py-4">Visa</th>
                </tr>
              </thead>

              <tbody>
                {pilgrims.map((person, index) => (
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
                    <td className="px-3 py-4 text-[14px] font-medium text-slate-600">{person.solde}</td>
                    <td className="px-3 py-4">
                      <VisaBadge status={person.visa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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

function PrimaryButton({ label, icon }) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#0d8a6f] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(13,138,111,0.23)] transition hover:bg-[#0b7f66]">
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </button>
  );
}

function Select({ value }) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe3ea] bg-[#f2f3f7] px-3 py-2.5 text-[14px] text-slate-500 shadow-sm">
      {value}
      <span className="text-[10px]">▾</span>
    </button>
  );
}

function StatusBadge({ status }) {
  const tone = status === 'Dossiers approuvés' ? 'bg-[#d9f5ea] text-[#1d8a66]' : status === 'Enregistré' ? 'bg-[#dfebff] text-[#3f67d6]' : 'bg-[#ffe3d9] text-[#d86046]';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${tone}`}>{status}</span>;
}

function VisaBadge({ status }) {
  const tone = status === 'Validé' ? 'bg-[#ebf7ef] text-[#2e9f6a]' : status === 'En cours' ? 'bg-[#e7f0ff] text-[#466ddb]' : 'bg-[#fff1d8] text-[#d29a1a]';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${tone}`}>{status}</span>;
}
