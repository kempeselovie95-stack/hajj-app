import { createElement, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { useRealtime } from '../../hooks/useRealtime.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Banner, Button, Loader } from '../../ui/index.jsx';

const CATEGORY_STYLE = {
  NEWS: { colors: '#0B5D4C', emoji: '📰' },
  GUIDANCE: { colors: '#8a6a1f', emoji: '🕋' },
  HEALTH: { colors: '#1f6f78', emoji: '🩺' },
  TRAVEL: { colors: '#2E6F8E', emoji: '✈️' },
  OTHER: { colors: '#475569', emoji: '✨' },
};

/**
 * Actualités du pèlerinage au format « réels » : une publication par écran, défilement vertical par page,
 * image / vidéo / texte, bouton j'aime avec compteur et partage.
 */
export default function NewsScreen() {
  const { api, apiBaseUrl } = useAuth();
  const { t, formatRelativeTime } = useLanguage();
  const { data, loading, error, reload } = useLive(() => api.news.list(), [api]);
  useRealtime({ news: () => reload() }); // nouvelle actualité publiée / importée : le fil se met à jour tout seul
  const focused = useIsFocused(); // hors de l'onglet, plus aucune vidéo ne joue
  const [height, setHeight] = useState(0);
  const [index, setIndex] = useState(0);
  const [overrides, setOverrides] = useState({}); // « j'aime » appliqué tout de suite, confirmé ensuite par le serveur
  const [failure, setFailure] = useState('');

  const items = (data ?? []).map((item) => ({ ...item, ...(overrides[item.id] ?? {}) }));

  async function toggleLike(item) {
    const next = { aime: !item.aime, likes: Math.max(0, item.likes + (item.aime ? -1 : 1)) };
    setOverrides((current) => ({ ...current, [item.id]: next }));
    setFailure('');
    try {
      const saved = await (item.aime ? api.news.unlike(item.id) : api.news.like(item.id));
      setOverrides((current) => ({ ...current, [item.id]: { aime: saved.aime, likes: saved.likes } }));
    } catch {
      setOverrides((current) => ({ ...current, [item.id]: { aime: item.aime, likes: item.likes } }));
      setFailure(t('nw_loadError'));
    }
  }

  return (
    <View style={styles.flex} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {loading ? <Loader /> : error && !data ? <View style={styles.center}><Banner>{t('nw_loadError')}</Banner></View> : items.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>{t('nw_none')}</Text></View>
      ) : height > 0 ? (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            pagingEnabled
            snapToInterval={height}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
            onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.y / height))}
            onScroll={Platform.OS === 'web' ? (event) => setIndex(Math.round(event.nativeEvent.contentOffset.y / height)) : undefined}
            scrollEventThrottle={64}
            renderItem={({ item, index: i }) => (
              <Reel item={item} height={height} active={focused && i === index} apiBaseUrl={apiBaseUrl} t={t} when={formatRelativeTime(item.cree_le)} onLike={() => toggleLike(item)} />
            )}
          />
          <View pointerEvents="none" style={styles.topBar}>
            <Text style={styles.topTitle}>{t('nw_title')}</Text>
            <Text style={styles.topCount}>{index + 1}/{items.length}</Text>
          </View>
          {failure ? <View style={styles.toast}><Banner>{failure}</Banner></View> : null}
        </>
      ) : null}
    </View>
  );
}

const DOUBLE_TAP_MS = 280;
const absolute = (apiBaseUrl, url) => (!url ? null : /^https?:\/\//i.test(url) ? url : `${apiBaseUrl}${url}`);

function Reel({ item, height, active, apiBaseUrl, t, when, onLike }) {
  const style = CATEGORY_STYLE[item.categorie] ?? CATEGORY_STYLE.OTHER;
  const mediaUrl = absolute(apiBaseUrl, item.media_url);
  const isVideo = item.media_type === 'VIDEO' && !!mediaUrl;
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true); // le web exige « muet » pour lancer une vidéo automatiquement
  const lastTap = useRef(0);
  const singleTimer = useRef(null);
  const burst = useRef(new Animated.Value(0)).current;

  // Une vidéo qui redevient visible repart de zéro (lecture automatique).
  useEffect(() => { if (active) setPaused(false); }, [active]);
  useEffect(() => () => clearTimeout(singleTimer.current), []);

  const showBurst = () => {
    burst.setValue(0);
    Animated.sequence([
      Animated.spring(burst, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
      Animated.timing(burst, { toValue: 0, duration: 380, delay: 250, useNativeDriver: true }),
    ]).start();
  };

  // Toucher : pause / lecture de la vidéo. Double toucher : j'aime (avec cœur animé), sans mettre en pause.
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      clearTimeout(singleTimer.current);
      if (!item.aime) onLike();
      showBurst();
      return;
    }
    lastTap.current = now;
    clearTimeout(singleTimer.current);
    singleTimer.current = setTimeout(() => { if (isVideo) setPaused((value) => !value); }, DOUBLE_TAP_MS);
  };

  return (
    <View style={[styles.reel, { height, backgroundColor: style.colors }]}>
      {item.media_type === 'IMAGE' && mediaUrl ? <Image source={{ uri: mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={item.titre} /> : null}
      {isVideo ? <ReelVideo url={mediaUrl} playing={active && !paused} muted={muted} t={t} /> : null}
      {!mediaUrl || item.media_type === 'NONE' ? <View style={styles.emojiWrap}><Text style={styles.emoji}>{style.emoji}</Text></View> : null}
      <View style={styles.shade} pointerEvents="none" />
      <Pressable onPress={onTap} style={StyleSheet.absoluteFill} accessibilityLabel={item.titre} />
      {isVideo && paused ? <View style={styles.pauseBadge} pointerEvents="none"><Text style={styles.pauseIcon}>▶</Text></View> : null}
      <Animated.View pointerEvents="none" style={[styles.burst, { opacity: burst, transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.25] }) }] }]}>
        <Text style={styles.burstIcon}>❤️</Text>
      </Animated.View>

      <View style={styles.actions}>
        <Pressable onPress={onLike} accessibilityRole="button" accessibilityLabel={item.aime ? t('nw_unlike') : t('nw_like')} style={styles.action}>
          <Text style={styles.actionIcon}>{item.aime ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionText}>{item.likes}</Text>
        </Pressable>
        {isVideo ? (
          <Pressable onPress={() => setMuted((value) => !value)} accessibilityRole="button" accessibilityLabel={muted ? t('nw_unmute') : t('nw_mute')} style={styles.action}>
            <Text style={styles.actionIcon}>{muted ? '🔇' : '🔊'}</Text>
            <Text style={styles.actionText}>{muted ? t('nw_unmute') : t('nw_mute')}</Text>
          </Pressable>
        ) : null}
        {item.source_url ? (
          <Pressable onPress={() => Linking.openURL(item.source_url)} accessibilityRole="link" accessibilityLabel={t('nw_source')} style={styles.action}>
            <Text style={styles.actionIcon}>🔗</Text>
            <Text style={styles.actionText}>{t('nw_source')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.caption} pointerEvents="none">
        <View style={styles.pill}><Text style={styles.pillText}>{t(`newscat_${item.categorie}`)}</Text></View>
        <Text style={styles.title}>{item.titre}</Text>
        {item.contenu ? <Text style={styles.body} numberOfLines={7}>{item.contenu}</Text> : null}
        <Text style={styles.meta}>{item.source_nom || item.auteur_nom} · {when}</Text>
      </View>
    </View>
  );
}

// expo-av est optionnel pour la vidéo native ; sur le web on utilise l'élément <video>.
let ExpoAv = null;
try { ExpoAv = require('expo-av'); } catch { ExpoAv = null; }

function ReelVideo({ url, playing, muted, t }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) { const attempt = video.play?.(); if (attempt?.catch) attempt.catch(() => {}); }
    else video.pause?.();
  }, [playing, url]);
  if (Platform.OS === 'web') {
    return createElement('video', { ref, src: url, autoPlay: playing, loop: true, muted, playsInline: true, preload: 'auto', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' } });
  }
  if (ExpoAv?.Video) {
    const { Video, ResizeMode } = ExpoAv;
    return <Video source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay={playing} isLooping isMuted={muted} />;
  }
  return <View style={styles.emojiWrap}><Button label={`▶  ${t('nw_playVideo')}`} onPress={() => Linking.openURL(url)} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: THEME.spacing.lg, backgroundColor: THEME.colors.background },
  empty: { fontFamily: FONTS.bodyRegular, color: THEME.colors.textSecondary },
  reel: { width: '100%', justifyContent: 'flex-end', overflow: 'hidden' },
  emojiWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 120 },
  emoji: { fontSize: 110, opacity: 0.9 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  caption: { padding: THEME.spacing.lg, paddingBottom: THEME.spacing.xl, paddingRight: 84, gap: 8 },
  pill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: THEME.radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontFamily: FONTS.bodySemibold, fontSize: 11, color: '#fff', letterSpacing: 0.5 },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: '#fff' },
  body: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: 'rgba(255,255,255,0.92)', lineHeight: 23 },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: 'rgba(255,255,255,0.75)' },
  actions: { position: 'absolute', right: 12, bottom: 160, alignItems: 'center', gap: 20 },
  action: { alignItems: 'center', gap: 2, minWidth: 56 },
  actionIcon: { fontSize: 34 },
  actionText: { fontFamily: FONTS.bodySemibold, fontSize: 12, color: '#fff' },
  pauseBadge: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseIcon: { fontSize: 64, color: 'rgba(255,255,255,0.85)' },
  burst: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  burstIcon: { fontSize: 110 },
  topBar: { position: 'absolute', top: 14, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  topTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: '#fff' },
  topCount: { fontFamily: FONTS.monoRegular, fontSize: THEME.typography.sizes.xs, color: 'rgba(255,255,255,0.8)' },
  toast: { position: 'absolute', top: 54, left: 16, right: 16 },
});
