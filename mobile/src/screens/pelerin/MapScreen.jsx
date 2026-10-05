import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Screen, Heading, Card, Button, Banner, Chips, Empty, Loader } from '../../ui/index.jsx';

const TYPE_EMOJI = { HOTEL: '🏨', HOLY_SITE: '🕋', MEETING: '📍', HOSPITAL: '🏥', AIRPORT: '✈️', OTHER: '📌' };
const TYPES = ['HOLY_SITE', 'HOTEL', 'MEETING', 'HOSPITAL', 'AIRPORT', 'OTHER'];

/** Carte OpenStreetMap interactive sur le web ; image de carte statique sur iOS/Android (aucune clé API, aucune dépendance). */
function MapView({ place }) {
  const { latitude: lat, longitude: lng } = place;
  if (Platform.OS === 'web') {
    const bbox = [lng - 0.02, lat - 0.012, lng + 0.02, lat + 0.012].join('%2C');
    return createElement('iframe', {
      title: place.nom, loading: 'lazy', referrerPolicy: 'no-referrer',
      src: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`,
      style: { border: 0, width: '100%', height: 280, borderRadius: 16 },
    });
  }
  return <Image style={styles.staticMap} resizeMode="cover" accessibilityLabel={place.nom}
    source={{ uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=640x360&markers=${lat},${lng},red-pushpin` }} />;
}

function mapsUrl(place) {
  const { latitude: lat, longitude: lng, nom } = place;
  if (Platform.OS === 'ios') return `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(nom)}`;
  if (Platform.OS === 'android') return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(nom)})`;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Carte du pèlerin : lieux saints, aéroports, hôtel et points de rendez-vous de son agence. */
export default function MapScreen() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const { data, loading, error } = useLive(() => api.operations.places.list(), [api]);
  const [type, setType] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('places'); // places | hotels
  const [center, setCenter] = useState(null); // { lat, lng, label }
  const [radius, setRadius] = useState(3000);
  const [hotels, setHotels] = useState({ items: [], loading: false, error: '', osm: true });
  const [locating, setLocating] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);

  const searchHotels = useCallback(async (from, meters) => {
    setHotels((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await api.operations.places.nearby({ lat: from.lat, lng: from.lng, radius: meters, type: 'HOTEL' });
      setHotels({ items: result.items, loading: false, error: '', osm: result.osm });
      setSelectedHotel(result.items[0] ?? null);
    } catch { setHotels({ items: [], loading: false, error: t('mp_nearbyError'), osm: true }); }
  }, [api, t]);

  useEffect(() => { if (mode === 'hotels' && center) searchHotels(center, radius); }, [mode, center, radius, searchHotels]);

  async function locateMe() {
    setLocating(true);
    try { const position = await getPosition(); setCenter({ ...position, label: t('mp_myPosition') }); }
    catch { setHotels((current) => ({ ...current, error: t('mp_locationDenied') })); }
    finally { setLocating(false); }
  }

  const places = data ?? [];
  const visible = useMemo(() => places.filter((place) => type === 'ALL' || place.type === type), [places, type]);
  const selected = places.find((place) => place.id === selectedId) ?? visible[0] ?? null;
  const presentTypes = TYPES.filter((value) => places.some((place) => place.type === value));

  return (
    <Screen>
      <Heading kicker={t('mp_kicker')} title={t('mp_title')} subtitle={t('mp_subtitle')} />
      <Chips value={mode} onChange={setMode} options={[{ value: 'places', label: `📍 ${t('mp_tabPlaces')}` }, { value: 'hotels', label: `🏨 ${t('mp_nearbyHotels')}` }]} />
      {mode === 'hotels' ? (
        <>
          <Card>
            <Text style={styles.name}>🏨 {t('mp_nearbyHotels')}</Text>
            <Text style={styles.meta}>{t('mp_nearbyHint')}</Text>
            <Button label={`🎯  ${t('mp_locateMe')}`} loading={locating} onPress={locateMe} />
            <Chips scroll value={center?.label ?? ''} onChange={(label) => { const key = label === t('mp_makkah') ? 'makkah' : 'madinah'; setCenter({ ...CENTERS[key], label }); }}
              options={[{ value: t('mp_makkah'), label: `🕋 ${t('mp_makkah')}` }, { value: t('mp_madinah'), label: `🕌 ${t('mp_madinah')}` }]} />
            <Chips scroll value={radius} onChange={setRadius} options={RADII.map((value) => ({ value, label: formatDistance(value) }))} />
          </Card>
          <Banner>{hotels.error}</Banner>
          {!center ? <Empty>{t('mp_pickCenter')}</Empty> : hotels.loading ? <Loader /> : (
            <>
              {!hotels.osm ? <Banner tone="info">{t('mp_osmOffline')}</Banner> : null}
              <Text style={styles.meta}>{t('mp_resultsAround', { count: hotels.items.length, place: center.label })}</Text>
              {selectedHotel ? (
                <Card>
                  <MapView place={selectedHotel} />
                  <Text style={styles.name}>🏨 {selectedHotel.nom}</Text>
                  <Text style={styles.meta}>{formatDistance(selectedHotel.distance_m)}{selectedHotel.etoiles ? ` · ${'★'.repeat(Math.min(5, selectedHotel.etoiles))}` : ''}{selectedHotel.adresse ? ` · ${selectedHotel.adresse}` : ''}</Text>
                  {selectedHotel.telephone ? <Text style={styles.link} onPress={() => Linking.openURL(`tel:${selectedHotel.telephone}`)}>📞 {selectedHotel.telephone}</Text> : null}
                  {selectedHotel.site ? <Text style={styles.link} onPress={() => Linking.openURL(selectedHotel.site)}>🌐 {selectedHotel.site}</Text> : null}
                  <Button label={`🧭  ${t('mp_open')}`} onPress={() => Linking.openURL(mapsUrl(selectedHotel))} />
                </Card>
              ) : <Empty>{t('mp_noHotels')}</Empty>}
              {hotels.items.map((hotel) => (
                <Pressable key={hotel.id} onPress={() => setSelectedHotel(hotel)} accessibilityRole="button" style={[styles.row, selectedHotel?.id === hotel.id && styles.rowActive]}>
                  <Text style={styles.rowEmoji}>🏨</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.rowTitle}>{hotel.nom}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{formatDistance(hotel.distance_m)}{hotel.source === 'agence' ? ` · ${t('mp_agencyHotel')}` : ''}{hotel.adresse ? ` · ${hotel.adresse}` : ''}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </>
          )}
        </>
      ) : null}
      {mode !== 'places' ? null : error && !data ? <Banner>{t('mp_loadError')}</Banner> : null}
      {mode !== 'places' ? null : loading ? <Loader /> : places.length === 0 ? <Empty>{t('mp_none')}</Empty> : (
        <>
          {selected ? (
            <Card>
              <MapView place={selected} />
              <Text style={styles.name}>{TYPE_EMOJI[selected.type]} {selected.nom}</Text>
              <Text style={styles.meta}>{t(`placetype_${selected.type}`)}{selected.adresse ? ` · ${selected.adresse}` : ''}{selected.agence_id == null ? ` · ${t('mp_commonPlace')}` : ''}</Text>
              {selected.description ? <Text style={styles.desc}>{selected.description}</Text> : null}
              <Text style={styles.coords}>{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</Text>
              <Button label={`🧭  ${t('mp_open')}`} onPress={() => Linking.openURL(mapsUrl(selected))} />
            </Card>
          ) : null}

          <Chips scroll value={type} onChange={setType} options={[{ value: 'ALL', label: t('mp_all') }, ...presentTypes.map((value) => ({ value, label: `${TYPE_EMOJI[value]} ${t(`placetype_${value}`)}` }))]} />
          {visible.map((place) => (
            <Pressable key={place.id} onPress={() => setSelectedId(place.id)} accessibilityRole="button" style={[styles.row, selected?.id === place.id && styles.rowActive]}>
              <Text style={styles.rowEmoji}>{TYPE_EMOJI[place.type]}</Text>
              <View style={styles.flex1}>
                <Text style={styles.rowTitle}>{place.nom}</Text>
                <Text style={styles.meta} numberOfLines={1}>{t(`placetype_${place.type}`)}{place.adresse ? ` · ${place.adresse}` : ''}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  staticMap: { width: '100%', height: 190, borderRadius: THEME.radius.lg, backgroundColor: THEME.colors.surfaceMuted },
  name: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  desc: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textPrimary },
  link: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary, textDecorationLine: 'underline' },
  coords: { fontFamily: FONTS.monoRegular, fontSize: 11, color: THEME.colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.radius.md, padding: 12 },
  rowActive: { borderColor: THEME.colors.primary, backgroundColor: THEME.colors.primaryTint },
  rowEmoji: { fontSize: 24 },
  rowTitle: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  chevron: { fontSize: 22, color: THEME.colors.textSecondary },
});
