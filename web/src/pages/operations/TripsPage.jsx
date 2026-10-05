import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import ResourceSection from '../../components/common/ResourceSection.jsx';
import RoomsPanel from './RoomsPanel.jsx';

const TABS = ['trips', 'flights', 'hotels', 'transports', 'program', 'places'];
const PLACE_TYPES = ['HOLY_SITE', 'HOTEL', 'MEETING', 'HOSPITAL', 'AIRPORT', 'OTHER'];
const TRIP_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
const FLIGHT_STATUSES = ['SCHEDULED', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED'];
const PROGRAM_TYPES = ['FLIGHT', 'HOTEL', 'TRANSPORT', 'RITUAL', 'VISIT', 'OTHER'];

const STATUS_TONE = {
  PLANNED: 'bg-slate-100 text-slate-700', ONGOING: 'bg-blue-50 text-blue-700', COMPLETED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-red-50 text-red-700',
  SCHEDULED: 'bg-slate-100 text-slate-700', DELAYED: 'bg-amber-50 text-amber-800', DEPARTED: 'bg-blue-50 text-blue-700', ARRIVED: 'bg-emerald-50 text-emerald-700',
};

function Pill({ value, label }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[value] ?? 'bg-slate-100 text-slate-700'}`}>{label}</span>;
}

export default function TripsPage() {
  const { api, user } = useAuth();
  const { t, formatDate, formatDateTime } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const ops = api.operations;

  const [tab, setTab] = useState('trips');
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState('');
  const [rows, setRows] = useState({ flights: [], hotels: [], transports: [], program: [] });
  const [groups, setGroups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flightGroups, setFlightGroups] = useState(null); // { flight, selected }
  const [openHotelId, setOpenHotelId] = useState(null);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [places, setPlaces] = useState([]);

  const trip = useMemo(() => trips.find((item) => String(item.id) === String(tripId)) ?? null, [trips, tripId]);
  const tripGroups = useMemo(() => groups.filter((group) => !trip || Number(group.agence_id) === Number(trip.agence_id)), [groups, trip]);
  const tripVehicles = useMemo(() => vehicles.filter((vehicle) => !trip || Number(vehicle.agence_id) === Number(trip.agence_id)), [vehicles, trip]);

  const loadBase = useCallback(async () => {
    try {
      const [tripList, groupData, vehicleList, agencyData] = await Promise.all([
        ops.trips.list(), api.groups.list(), ops.vehicles.list(), isAdmin ? api.admin.listAgencies() : Promise.resolve({ agences: [] }),
      ]);
      setTrips(tripList);
      setGroups(groupData.groupes ?? []);
      setVehicles(vehicleList);
      setAgencies(agencyData.agences ?? []);
      setTripId((current) => current || (tripList[0] ? String(tripList[0].id) : ''));
      setError('');
    } catch { setError(t('trip_loadError')); }
    finally { setLoading(false); }
  }, [api, ops, isAdmin, t]);
  useEffect(() => { loadBase(); }, [loadBase]);

  const loadTab = useCallback(async (name) => {
    if (name === 'places') {
      try { setPlaces(await ops.places.list()); setError(''); } catch { setError(t('trip_loadError')); }
      return;
    }
    if (!tripId || name === 'trips') return;
    try {
      const items = await ops[name].list({ voyage_id: tripId });
      setRows((current) => ({ ...current, [name]: items }));
      setError('');
    } catch { setError(t('trip_loadError')); }
  }, [ops, tripId, t]);
  useEffect(() => { loadTab(tab); }, [loadTab, tab]);

  const guard = (action) => async (...args) => {
    setError('');
    try { return await action(...args); } catch (requestError) { setError(requestError.response?.data?.message || t('res_saveError')); throw requestError; }
  };

  const tripFields = [
    ...(isAdmin ? [{ name: 'agence_id', label: t('trip_agency'), type: 'select', required: true, options: agencies.map((agency) => ({ value: agency.id, label: `${agency.nom_agence ?? agency.name} #${agency.id}` })), numeric: true }] : []),
    { name: 'nom', label: t('trip_name'), required: true, max: 150 },
    { name: 'date_depart', label: t('trip_departure'), type: 'date' },
    { name: 'date_retour', label: t('trip_return'), type: 'date' },
    { name: 'statut', label: t('c_status'), type: 'select', required: true, defaultValue: 'PLANNED', options: TRIP_STATUSES.map((value) => ({ value, label: t(`tripstatus_${value}`) })) },
    { name: 'description', label: t('op_description'), type: 'textarea', max: 2000 },
  ];

  const groupOptions = tripGroups.map((group) => ({ value: group.id, label: group.nom }));

  const tabLabels = { trips: t('trip_tab_trips'), flights: t('trip_tab_flights'), hotels: t('trip_tab_hotels'), transports: t('trip_tab_transports'), program: t('trip_tab_program'), places: t('trip_tab_places') };

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{t('trip_kicker')}</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">{t('travel')}</h1><p className="mt-2 text-sm text-slate-500">{t('trip_subtitle')}</p></div>
        {tab !== 'trips' && tab !== 'places' && trips.length > 0 && (
          <label className="text-xs font-medium text-slate-600">{t('trip_select')}
            <select value={tripId} onChange={(event) => setTripId(event.target.value)} className="field !mt-1 min-w-56">{trips.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select>
          </label>
        )}
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === name ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{tabLabels[name]}</button>
        ))}
      </div>

      {tab !== 'trips' && tab !== 'places' && !trip && !loading && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{t('trip_needTrip')}</p>}

      {tab === 'trips' && (
        <ResourceSection title={t('trip_tab_trips')} items={trips} loading={loading} createLabel={t('trip_new')} emptyText={t('trip_none')}
          columns={[
            { key: 'nom', label: t('trip_name'), render: (item) => <span className="font-medium text-slate-800">{item.nom}</span> },
            ...(isAdmin ? [{ key: 'nom_agence', label: t('trip_agency') }] : []),
            { key: 'date_depart', label: t('trip_departure'), render: (item) => formatDate(item.date_depart) },
            { key: 'date_retour', label: t('trip_return'), render: (item) => formatDate(item.date_retour) },
            { key: 'statut', label: t('c_status'), render: (item) => <Pill value={item.statut} label={t(`tripstatus_${item.statut}`)} /> },
          ]}
          fields={tripFields}
          onSave={guard(async (item, payload) => { if (item) await ops.trips.update(item.id, payload); else await ops.trips.create(payload); await loadBase(); })}
          onDelete={guard(async (item) => { await ops.trips.remove(item.id); setTripId(''); await loadBase(); })} />
      )}

      {tab === 'flights' && trip && (
        <>
          <ResourceSection title={t('trip_tab_flights')} items={rows.flights} loading={false} createLabel={t('fl_new')} emptyText={t('fl_none')}
            columns={[
              { key: 'numero_vol', label: t('fl_number'), render: (item) => <span className="font-mono font-semibold text-slate-800">{item.numero_vol}</span> },
              { key: 'compagnie', label: t('fl_airline') },
              { key: 'route', label: t('fl_route'), render: (item) => `${item.aeroport_depart} → ${item.aeroport_arrivee}` },
              { key: 'depart_le', label: t('fl_departure'), render: (item) => formatDateTime(item.depart_le) },
              { key: 'arrivee_le', label: t('fl_arrival'), render: (item) => formatDateTime(item.arrivee_le) },
              { key: 'terminal', label: t('fl_terminal') },
              { key: 'statut', label: t('c_status'), render: (item) => <Pill value={item.statut} label={t(`flightstatus_${item.statut}`)} /> },
              { key: 'groupes', label: t('fl_groups') },
            ]}
            fields={[
              { name: 'numero_vol', label: t('fl_number'), required: true, max: 20 }, { name: 'compagnie', label: t('fl_airline'), max: 100 },
              { name: 'aeroport_depart', label: t('fl_from'), required: true, max: 100 }, { name: 'aeroport_arrivee', label: t('fl_to'), required: true, max: 100 },
              { name: 'depart_le', label: t('fl_departure'), type: 'datetime-local', required: true }, { name: 'arrivee_le', label: t('fl_arrival'), type: 'datetime-local', required: true },
              { name: 'terminal', label: t('fl_terminal'), max: 30 },
              { name: 'statut', label: t('c_status'), type: 'select', required: true, defaultValue: 'SCHEDULED', options: FLIGHT_STATUSES.map((value) => ({ value, label: t(`flightstatus_${value}`) })) },
            ]}
            rowActions={(item) => <button type="button" onClick={() => setFlightGroups({ flight: item, selected: new Set((item.groupe_ids || '').split(',').filter(Boolean).map(Number)) })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('fl_assignGroups')}</button>}
            onSave={guard(async (item, payload) => { if (item) await ops.flights.update(item.id, payload); else await ops.flights.create({ ...payload, voyage_id: trip.id }); await loadTab('flights'); })}
            onDelete={guard(async (item) => { await ops.flights.remove(item.id); await loadTab('flights'); })} />
          {flightGroups && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setFlightGroups(null); }}>
              <form onSubmit={guard(async (event) => { event.preventDefault(); await ops.flights.setGroups(flightGroups.flight.id, [...flightGroups.selected]); setFlightGroups(null); await loadTab('flights'); })} className="w-full space-y-4 rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
                <h3 className="text-lg font-semibold text-slate-900">{t('fl_assignGroups')} — {flightGroups.flight.numero_vol}</h3>
                {!tripGroups.length ? <p className="text-sm text-slate-500">{t('fl_noGroups')}</p> : (
                  <ul className="max-h-64 space-y-1 overflow-auto">{tripGroups.map((group) => (
                    <li key={group.id}><label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={flightGroups.selected.has(group.id)} onChange={(event) => setFlightGroups((current) => { const next = new Set(current.selected); if (event.target.checked) next.add(group.id); else next.delete(group.id); return { ...current, selected: next }; })} />
                      {group.nom}<span className="ms-auto text-xs text-slate-400">{group.total_membres}</span>
                    </label></li>
                  ))}</ul>
                )}
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setFlightGroups(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button><button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">{t('c_save')}</button></div>
              </form>
            </div>
          )}
        </>
      )}

      {tab === 'hotels' && trip && (
        <ResourceSection title={t('trip_tab_hotels')} items={rows.hotels} loading={false} createLabel={t('ht_new')} emptyText={t('ht_none')}
          columns={[
            { key: 'nom', label: t('c_name'), render: (item) => <span className="font-medium text-slate-800">{item.nom}</span> },
            { key: 'ville', label: t('ht_city') },
            { key: 'check_in', label: t('ht_checkIn'), render: (item) => formatDate(item.check_in) },
            { key: 'check_out', label: t('ht_checkOut'), render: (item) => formatDate(item.check_out) },
            { key: 'telephone', label: t('phone') },
            { key: 'occupation', label: t('ht_occupancy'), render: (item) => `${item.occupants}/${item.capacite_totale} · ${t('ht_rooms', { count: item.total_chambres })}` },
          ]}
          fields={[
            { name: 'nom', label: t('c_name'), required: true, max: 150 }, { name: 'ville', label: t('ht_city'), required: true, max: 100 },
            { name: 'adresse', label: t('org_fAddress'), max: 255 }, { name: 'telephone', label: t('phone'), max: 30 },
            { name: 'check_in', label: t('ht_checkIn'), type: 'date' }, { name: 'check_out', label: t('ht_checkOut'), type: 'date' },
          ]}
          rowActions={(item) => <button type="button" onClick={() => setOpenHotelId(openHotelId === item.id ? null : item.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{openHotelId === item.id ? t('ht_hideRooms') : t('ht_manageRooms')}</button>}
          extra={openHotelId && rows.hotels.find((hotel) => hotel.id === openHotelId) && <div className="border-b border-slate-100 bg-slate-50/50"><RoomsPanel hotel={rows.hotels.find((hotel) => hotel.id === openHotelId)} onChanged={() => loadTab('hotels')} /></div>}
          onSave={guard(async (item, payload) => { if (item) await ops.hotels.update(item.id, payload); else await ops.hotels.create({ ...payload, voyage_id: trip.id }); await loadTab('hotels'); })}
          onDelete={guard(async (item) => { await ops.hotels.remove(item.id); setOpenHotelId(null); await loadTab('hotels'); })} />
      )}

      {tab === 'transports' && trip && (
        <>
          <ResourceSection title={t('trip_tab_transports')} items={rows.transports} loading={false} createLabel={t('tp_new')} emptyText={t('tp_none')}
            subtitle={<button type="button" onClick={() => setVehicleDialog(true)} className="text-xs font-medium text-emerald-800 underline">{t('tp_manageVehicles', { count: tripVehicles.length })}</button>}
            columns={[
              { key: 'depart_le', label: t('fl_departure'), render: (item) => formatDateTime(item.depart_le) },
              { key: 'route', label: t('tp_route'), render: (item) => `${item.lieu_depart} → ${item.destination}` },
              { key: 'vehicule_nom', label: t('tp_vehicle'), render: (item) => (item.vehicule_nom ? `${item.vehicule_nom} (${item.vehicule_capacite})` : '—') },
              { key: 'groupe_nom', label: t('gr_colGroup') },
            ]}
            fields={[
              { name: 'lieu_depart', label: t('tp_from'), required: true, max: 150 }, { name: 'destination', label: t('tp_to'), required: true, max: 150 },
              { name: 'depart_le', label: t('fl_departure'), type: 'datetime-local', required: true },
              { name: 'vehicule_id', label: t('tp_vehicle'), type: 'select', numeric: true, options: tripVehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.nom} (${vehicle.capacite})` })) },
              { name: 'groupe_id', label: t('gr_colGroup'), type: 'select', numeric: true, options: groupOptions },
            ]}
            onSave={guard(async (item, payload) => { if (item) await ops.transports.update(item.id, payload); else await ops.transports.create({ ...payload, voyage_id: trip.id }); await loadTab('transports'); })}
            onDelete={guard(async (item) => { await ops.transports.remove(item.id); await loadTab('transports'); })} />
          {vehicleDialog && (
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setVehicleDialog(false); }}>
              <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-3 shadow-2xl sm:max-w-3xl sm:rounded-2xl">
                <ResourceSection title={t('tp_vehicles')} items={tripVehicles} loading={false} createLabel={t('tp_newVehicle')} emptyText={t('tp_noVehicles')}
                  columns={[
                    { key: 'nom', label: t('c_name') }, { key: 'immatriculation', label: t('tp_plate') }, { key: 'capacite', label: t('rm_capacity') },
                    { key: 'chauffeur_nom', label: t('tp_driver'), render: (item) => [item.chauffeur_nom, item.chauffeur_telephone].filter(Boolean).join(' · ') || '—' },
                  ]}
                  fields={[
                    ...(isAdmin ? [{ name: 'agence_id', label: t('trip_agency'), type: 'select', required: true, numeric: true, defaultValue: trip.agence_id, options: agencies.map((agency) => ({ value: agency.id, label: `${agency.nom_agence ?? agency.name} #${agency.id}` })) }] : []),
                    { name: 'nom', label: t('c_name'), required: true, max: 100 }, { name: 'immatriculation', label: t('tp_plate'), max: 30 },
                    { name: 'capacite', label: t('rm_capacity'), type: 'number', required: true, min: 1, defaultValue: 50 },
                    { name: 'chauffeur_nom', label: t('tp_driver'), max: 120 }, { name: 'chauffeur_telephone', label: t('phone'), max: 30 },
                  ]}
                  onSave={guard(async (item, payload) => { if (item) await ops.vehicles.update(item.id, payload); else await ops.vehicles.create(payload); setVehicles(await ops.vehicles.list()); })}
                  onDelete={guard(async (item) => { await ops.vehicles.remove(item.id); setVehicles(await ops.vehicles.list()); })} />
                <div className="p-3 text-end"><button type="button" onClick={() => setVehicleDialog(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('c_close')}</button></div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'places' && (
        <ResourceSection title={t('trip_tab_places')} subtitle={t('mp_subtitle')} items={places} loading={false} createLabel={t('pl_new')} emptyText={t('pl_none')}
          columns={[
            { key: 'nom', label: t('c_name'), render: (item) => <span className="font-medium text-slate-800">{item.nom}</span> },
            { key: 'type', label: t('pl_type'), render: (item) => t(`placetype_${item.type}`) },
            { key: 'coords', label: `${t('mp_lat')} / ${t('mp_lng')}`, render: (item) => <span className="font-mono text-xs">{Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</span> },
            { key: 'adresse', label: t('mp_address') },
            { key: 'agence_id', label: t('trip_agency'), render: (item) => (item.agence_id ? `#${item.agence_id}` : t('mp_commonPlace')) },
          ]}
          fields={[
            ...(isAdmin ? [{ name: 'agence_id', label: `${t('trip_agency')} (${t('mp_commonPlace')})`, type: 'select', numeric: true, options: agencies.map((agency) => ({ value: agency.id, label: `${agency.nom_agence ?? agency.name} #${agency.id}` })) }] : []),
            { name: 'nom', label: t('c_name'), required: true, max: 150 },
            { name: 'type', label: t('pl_type'), type: 'select', required: true, defaultValue: 'OTHER', options: PLACE_TYPES.map((value) => ({ value, label: t(`placetype_${value}`) })) },
            { name: 'latitude', label: t('mp_lat'), type: 'number', step: 'any', required: true },
            { name: 'longitude', label: t('mp_lng'), type: 'number', step: 'any', required: true },
            { name: 'adresse', label: t('mp_address'), max: 255 },
            { name: 'description', label: t('op_description'), type: 'textarea', max: 2000 },
          ]}
          onSave={guard(async (item, payload) => { if (item) await ops.places.update(item.id, payload); else await ops.places.create(payload); await loadTab('places'); })}
          onDelete={guard(async (item) => { await ops.places.remove(item.id); await loadTab('places'); })} />
      )}

      {tab === 'program' && trip && (
        <ResourceSection title={t('trip_tab_program')} items={rows.program} loading={false} createLabel={t('pg2_new')} emptyText={t('pg2_none')}
          columns={[
            { key: 'debut_le', label: t('pg2_when'), render: (item) => formatDateTime(item.debut_le) },
            { key: 'titre', label: t('pg2_title'), render: (item) => <span className="font-medium text-slate-800">{item.titre}</span> },
            { key: 'type', label: t('pg2_type'), render: (item) => t(`progtype_${item.type}`) },
            { key: 'lieu', label: t('pg2_place') },
            { key: 'groupe_nom', label: t('gr_colGroup'), render: (item) => item.groupe_nom || t('pg2_allGroups') },
          ]}
          fields={[
            { name: 'titre', label: t('pg2_title'), required: true, max: 200 },
            { name: 'type', label: t('pg2_type'), type: 'select', required: true, defaultValue: 'OTHER', options: PROGRAM_TYPES.map((value) => ({ value, label: t(`progtype_${value}`) })) },
            { name: 'debut_le', label: t('pg2_when'), type: 'datetime-local', required: true }, { name: 'lieu', label: t('pg2_place'), max: 150 },
            { name: 'groupe_id', label: t('gr_colGroup'), type: 'select', numeric: true, options: groupOptions },
            { name: 'description', label: t('op_description'), type: 'textarea', max: 2000 },
          ]}
          onSave={guard(async (item, payload) => { if (item) await ops.program.update(item.id, payload); else await ops.program.create({ ...payload, voyage_id: trip.id }); await loadTab('program'); })}
          onDelete={guard(async (item) => { await ops.program.remove(item.id); await loadTab('program'); })} />
      )}
    </section>
  );
}
