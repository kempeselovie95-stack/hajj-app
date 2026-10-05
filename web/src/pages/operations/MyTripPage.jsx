import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import QrCode from '../../components/common/QrCode.jsx';

/** Espace pèlerin : QR Code, groupe/guide, vols, hôtel, transport et programme personnalisé. */
export default function MyTripPage() {
  const { api } = useAuth();
  const { t, formatDate, formatDateTime } = useLanguage();
  const [trip, setTrip] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.operations.myTrip(), api.operations.qr.mine().catch(() => null)])
      .then(([tripData, qrData]) => { if (active) { setTrip(tripData); setQr(qrData); } })
      .catch(() => { if (active) setError(t('my_loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, t]);

  if (loading) return <p className="text-sm text-slate-500">{t('loading')}</p>;
  if (error || !trip) return <p role="alert" className="text-sm text-red-700">{error}</p>;

  const empty = !trip.vols.length && !trip.hotels.length && !trip.transports.length && !trip.programme.length;
  // Regroupe le programme par jour.
  const byDay = trip.programme.reduce((days, event) => { const day = event.debut_le.slice(0, 10); (days[day] ||= []).push(event); return days; }, {});

  return (
    <section className="space-y-6 pb-8">
      <header><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{t('my_kicker')}</p><h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">{t('travel')}</h1></header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card flex flex-col items-center gap-3 text-center">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('my_qrTitle')}</h2>
          {qr ? <><QrCode value={qr.token} size={176} label={t('qr_aria')} /><p className="font-mono text-sm font-semibold text-text-primary">{qr.code}</p><p className="text-xs text-text-secondary">{t('my_qrHint')}</p></> : <p className="text-sm text-text-secondary">{t('my_noDossier')}</p>}
        </div>
        <div className="card space-y-3 md:col-span-2">
          <h2 className="font-display text-lg font-semibold text-text-primary">{t('my_group')}</h2>
          {trip.groupe ? (
            <dl className="grid gap-3 sm:grid-cols-3 text-sm">
              <div><dt className="text-xs uppercase tracking-wide text-text-secondary">{t('gr_colGroup')}</dt><dd className="font-medium text-text-primary">{trip.groupe.nom}<span className="block font-mono text-xs text-text-secondary">{trip.groupe.code}</span></dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-text-secondary">{t('gr_colGuide')}</dt><dd className="font-medium text-text-primary">{trip.groupe.guide || '—'}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-text-secondary">{t('phone')}</dt><dd className="font-medium text-text-primary">{trip.groupe.guide_telephone ? <a className="text-primary underline" href={`tel:${trip.groupe.guide_telephone}`}>{trip.groupe.guide_telephone}</a> : '—'}</dd></div>
            </dl>
          ) : <p className="text-sm text-text-secondary">{t('my_noGroup')}</p>}
        </div>
      </div>

      {empty && <p className="card text-center text-sm text-text-secondary">{t('my_empty')}</p>}

      {trip.vols.length > 0 && (
        <div className="card"><h2 className="mb-3 font-display text-lg font-semibold text-text-primary">{t('trip_tab_flights')}</h2>
          <ul className="divide-y divide-border">{trip.vols.map((flight) => (
            <li key={flight.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div><p className="font-mono font-semibold text-text-primary">{flight.numero_vol} <span className="font-body font-normal text-text-secondary">{flight.compagnie}</span></p><p className="text-text-secondary">{flight.aeroport_depart} → {flight.aeroport_arrivee}{flight.terminal ? ` · ${t('fl_terminal')} ${flight.terminal}` : ''}</p></div>
              <div className="text-end text-text-secondary"><p>{formatDateTime(flight.depart_le)}</p><p>→ {formatDateTime(flight.arrivee_le)}</p></div>
            </li>
          ))}</ul>
        </div>
      )}

      {trip.hotels.length > 0 && (
        <div className="card"><h2 className="mb-3 font-display text-lg font-semibold text-text-primary">{t('trip_tab_hotels')}</h2>
          <ul className="divide-y divide-border">{trip.hotels.map((hotel) => (
            <li key={hotel.id} className="py-3 text-sm">
              <p className="font-semibold text-text-primary">{hotel.nom} · {hotel.ville}</p>
              <p className="text-text-secondary">{t('rm_room', { number: hotel.chambre })} · {formatDate(hotel.check_in)} → {formatDate(hotel.check_out)}</p>
              {(hotel.adresse || hotel.telephone) && <p className="text-text-secondary">{[hotel.adresse, hotel.telephone].filter(Boolean).join(' · ')}</p>}
            </li>
          ))}</ul>
        </div>
      )}

      {trip.transports.length > 0 && (
        <div className="card"><h2 className="mb-3 font-display text-lg font-semibold text-text-primary">{t('trip_tab_transports')}</h2>
          <ul className="divide-y divide-border">{trip.transports.map((transport) => (
            <li key={transport.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div><p className="font-semibold text-text-primary">{transport.lieu_depart} → {transport.destination}</p><p className="text-text-secondary">{transport.vehicule_nom || '—'}{transport.chauffeur_nom ? ` · ${transport.chauffeur_nom}` : ''}</p></div>
              <p className="text-text-secondary">{formatDateTime(transport.depart_le)}</p>
            </li>
          ))}</ul>
        </div>
      )}

      {trip.programme.length > 0 && (
        <div className="card"><h2 className="mb-3 font-display text-lg font-semibold text-text-primary">{t('trip_tab_program')}</h2>
          <div className="space-y-4">{Object.entries(byDay).map(([day, events]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{formatDate(day, { dateStyle: 'full' })}</p>
              <ul className="space-y-2">{events.map((event) => (
                <li key={event.id} className="flex gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <time className="w-14 shrink-0 font-mono text-text-secondary">{event.debut_le.slice(11, 16)}</time>
                  <div><p className="font-medium text-text-primary">{event.titre}</p><p className="text-xs text-text-secondary">{[t(`progtype_${event.type}`), event.lieu].filter(Boolean).join(' · ')}</p>{event.description && <p className="mt-1 text-xs text-text-secondary">{event.description}</p>}</div>
                </li>
              ))}</ul>
            </div>
          ))}</div>
        </div>
      )}
    </section>
  );
}
