import { Linking, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import QrCode from '../../ui/QrCode.jsx';
import { Screen, Heading, Card, SectionTitle, Button, Banner, Empty, Loader } from '../../ui/index.jsx';

/** Mon voyage : QR Code, groupe et guide, vols, hôtel, transport et programme jour par jour. */
export default function TripScreen() {
  const { api } = useAuth();
  const { t, formatDate, formatDateTime } = useLanguage();
  const { data, loading, error } = useLive(async () => {
    const [trip, qr] = await Promise.all([api.operations.myTrip(), api.operations.qr.mine().catch(() => null)]);
    return { trip, qr };
  }, [api]);

  const trip = data?.trip;
  const qr = data?.qr;
  const empty = trip && !trip.vols.length && !trip.hotels.length && !trip.transports.length && !trip.programme.length;
  const byDay = (trip?.programme ?? []).reduce((days, event) => { const day = event.debut_le.slice(0, 10); (days[day] ||= []).push(event); return days; }, {});

  return (
    <Screen>
      <Heading kicker={t('my_kicker')} title={t('travel')} />
      {error && !trip ? <Banner>{t('my_loadError')}</Banner> : null}
      {loading ? <Loader /> : trip ? (
        <>
          <Card style={styles.center}>
            <Text style={styles.cardTitle}>{t('my_qrTitle')}</Text>
            {qr ? (
              <>
                <View style={styles.qrBox}><QrCode value={qr.token} size={200} /></View>
                <Text style={styles.code}>{qr.code}</Text>
                <Text style={styles.meta}>{t('my_qrHint')}</Text>
              </>
            ) : <Text style={styles.meta}>{t('my_noDossier')}</Text>}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>{t('my_group')}</Text>
            {trip.groupe ? (
              <>
                <Text style={styles.value}>{trip.groupe.nom}</Text>
                <Text style={styles.meta}>{trip.groupe.code}</Text>
                <Text style={styles.label}>{t('gr_colGuide')}</Text>
                <Text style={styles.value}>{trip.groupe.guide || '—'}</Text>
                {trip.groupe.guide_telephone ? <Button small variant="outline" label={`📞 ${trip.groupe.guide_telephone}`} onPress={() => Linking.openURL(`tel:${trip.groupe.guide_telephone}`)} /> : null}
              </>
            ) : <Text style={styles.meta}>{t('my_noGroup')}</Text>}
          </Card>

          {empty ? <Empty>{t('my_empty')}</Empty> : null}

          {trip.vols.length > 0 ? <><SectionTitle>{t('trip_tab_flights')}</SectionTitle>
            <Card>{trip.vols.map((flight) => (
              <View key={flight.id} style={styles.item}>
                <Text style={styles.value}>{flight.numero_vol} <Text style={styles.meta}>{flight.compagnie}</Text></Text>
                <Text style={styles.meta}>{flight.aeroport_depart} → {flight.aeroport_arrivee}{flight.terminal ? ` · ${t('fl_terminal')} ${flight.terminal}` : ''}</Text>
                <Text style={styles.meta}>{formatDateTime(flight.depart_le)} → {formatDateTime(flight.arrivee_le)}</Text>
              </View>
            ))}</Card></> : null}

          {trip.hotels.length > 0 ? <><SectionTitle>{t('trip_tab_hotels')}</SectionTitle>
            <Card>{trip.hotels.map((hotel) => (
              <View key={hotel.id} style={styles.item}>
                <Text style={styles.value}>{hotel.nom} · {hotel.ville}</Text>
                <Text style={styles.meta}>{t('rm_room', { number: hotel.chambre })} · {formatDate(hotel.check_in)} → {formatDate(hotel.check_out)}</Text>
                {hotel.telephone ? <Text style={styles.link} onPress={() => Linking.openURL(`tel:${hotel.telephone}`)}>{hotel.telephone}</Text> : null}
              </View>
            ))}</Card></> : null}

          {trip.transports.length > 0 ? <><SectionTitle>{t('trip_tab_transports')}</SectionTitle>
            <Card>{trip.transports.map((transport) => (
              <View key={transport.id} style={styles.item}>
                <Text style={styles.value}>{transport.lieu_depart} → {transport.destination}</Text>
                <Text style={styles.meta}>{formatDateTime(transport.depart_le)}{transport.vehicule_nom ? ` · ${transport.vehicule_nom}` : ''}{transport.chauffeur_nom ? ` · ${transport.chauffeur_nom}` : ''}</Text>
              </View>
            ))}</Card></> : null}

          {trip.programme.length > 0 ? <><SectionTitle>{t('trip_tab_program')}</SectionTitle>
            {Object.entries(byDay).map(([day, events]) => (
              <Card key={day}>
                <Text style={styles.day}>{formatDate(day, { dateStyle: 'full' })}</Text>
                {events.map((event) => (
                  <View key={event.id} style={styles.event}>
                    <Text style={styles.time}>{event.debut_le.slice(11, 16)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.value}>{event.titre}</Text>
                      <Text style={styles.meta}>{[t(`progtype_${event.type}`), event.lieu].filter(Boolean).join(' · ')}</Text>
                      {event.description ? <Text style={styles.meta}>{event.description}</Text> : null}
                    </View>
                  </View>
                ))}
              </Card>
            ))}</> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  qrBox: { padding: 10, backgroundColor: '#fff', borderRadius: THEME.radius.md, borderWidth: 1, borderColor: THEME.colors.border },
  cardTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  code: { fontFamily: FONTS.monoMedium, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: THEME.colors.textSecondary, marginTop: 6 },
  value: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary, marginTop: 2, textAlign: 'center' },
  link: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary, marginTop: 4 },
  item: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: THEME.colors.border },
  day: { fontFamily: FONTS.bodyBold, fontSize: 12, color: THEME.colors.primary, letterSpacing: 0.5 },
  event: { flexDirection: 'row', gap: 10, backgroundColor: THEME.colors.surfaceMuted, borderRadius: THEME.radius.md, padding: 10 },
  time: { fontFamily: FONTS.monoMedium, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary, width: 48 },
});
