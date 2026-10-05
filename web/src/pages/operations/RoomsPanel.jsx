import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/** Chambres d'un hôtel : création, occupation, affectation / retrait des pèlerins. */
export default function RoomsPanel({ hotel, onChanged }) {
  const { api } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState({ items: [], non_affectes: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ numero: '', capacite: 2 });
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try { setData(await api.operations.rooms.byHotel(hotel.id)); setError(''); }
    catch { setError(t('rm_loadError')); }
    finally { setLoading(false); }
  }, [api, hotel.id, t]);
  useEffect(() => { setLoading(true); reload(); }, [reload]);

  async function run(action) {
    setError('');
    try { await action(); await reload(); onChanged?.(); }
    catch (requestError) { setError(requestError.response?.data?.code === 'ROOM_FULL' ? t('rm_full') : requestError.response?.data?.message || t('res_saveError')); }
  }

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={(event) => { event.preventDefault(); run(async () => { await api.operations.rooms.create({ hotel_id: hotel.id, numero: form.numero, capacite: Number(form.capacite) }); setForm({ numero: '', capacite: 2 }); }); }} className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-slate-600">{t('rm_number')}<input required maxLength={20} value={form.numero} onChange={(event) => setForm((c) => ({ ...c, numero: event.target.value }))} className="field w-28" /></label>
        <label className="text-xs font-medium text-slate-600">{t('rm_capacity')}<input required type="number" min="1" max="20" value={form.capacite} onChange={(event) => setForm((c) => ({ ...c, capacite: event.target.value }))} className="field w-24" /></label>
        <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">{t('rm_add')}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">{t('loading')}</p> : !data.items.length ? <p className="text-sm text-slate-500">{t('rm_empty')}</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.items.map((room) => {
            const full = room.occupants.length >= room.capacite;
            return (
              <article key={room.id} className="rounded-xl border border-slate-200 p-3">
                <header className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800">{t('rm_room', { number: room.numero })}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${full ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{room.occupants.length}/{room.capacite}</span>
                </header>
                <ul className="mt-2 space-y-1">
                  {room.occupants.map((person) => (
                    <li key={person.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-700">
                      {person.prenom} {person.nom}
                      <button type="button" onClick={() => run(() => api.operations.rooms.unassign(room.id, person.id))} className="text-xs text-red-700 hover:underline">{t('rm_remove')}</button>
                    </li>
                  ))}
                </ul>
                {!full && data.non_affectes.length > 0 && (
                  <select aria-label={t('rm_assign')} value="" onChange={(event) => event.target.value && run(() => api.operations.rooms.assign(room.id, Number(event.target.value)))} className="field !mt-2 !py-1.5 text-xs">
                    <option value="">{t('rm_assign')}</option>
                    {data.non_affectes.map((person) => <option key={person.id} value={person.id}>{person.prenom} {person.nom}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => { if (window.confirm(t('res_confirmDelete'))) run(() => api.operations.rooms.remove(room.id)); }} className="mt-2 text-xs text-slate-500 hover:text-red-700">{t('rm_delete')}</button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
