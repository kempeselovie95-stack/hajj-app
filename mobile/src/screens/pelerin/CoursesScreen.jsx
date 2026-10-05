import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Screen, Heading, SectionTitle, Pill, Button, Banner, Chips, Empty, Loader, Field } from '../../ui/index.jsx';

/** Cours de mon guide / mon agence / de l'administration : couverture, pages, favoris, téléchargement, inscription. */
export default function CoursesScreen() {
  const { api, apiBaseUrl } = useAuth();
  const navigation = useNavigation();
  const { t, formatDate } = useLanguage();
  const { data, loading, error, reload } = useLive(() => api.courses.list(), [api]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [failure, setFailure] = useState('');

  async function run(course, action, failureKey) {
    setBusyId(course.id); setFailure('');
    try { await action(); reload(); } catch { setFailure(t(failureKey)); } finally { setBusyId(null); }
  }

  const download = (course, kind) => run(course, async () => {
    const link = await api.courses.downloadLink(course.id, { kind, inline: false });
    await Linking.openURL(`${apiBaseUrl}${link.url}`); // s'ouvre dans le navigateur / lecteur PDF du téléphone
  }, 'co_downloadError');

  const now = new Date().toISOString().slice(0, 16);
  const query = search.trim().toLowerCase();
  const items = (data ?? []).filter((course) => (tab === 'favorites' ? course.favori : true) && (!query || course.titre.toLowerCase().includes(query)));
  const open = (course) => navigation.navigate('CourseReader', { courseId: course.id });
  const upcoming = items.filter((course) => course.debut_le >= now);
  const past = items.filter((course) => course.debut_le < now && course.statut === 'PUBLISHED');

  const renderCourse = (course, isPast) => {
    const cancelled = course.statut === 'CANCELLED';
    return (
      <View key={course.id} style={[styles.card, cancelled && { opacity: 0.7 }]}>
        <Pressable onPress={() => open(course)} accessibilityRole="button" accessibilityLabel={course.titre} style={styles.cover}>
          {course.cover_url ? <Image source={{ uri: `${apiBaseUrl}${course.cover_url}` }} style={styles.coverImage} resizeMode="cover" accessibilityLabel={course.titre} /> : <Text style={styles.coverPlaceholder}>📖</Text>}
          <Pressable onPress={() => run(course, () => (course.favori ? api.courses.unfavorite(course.id) : api.courses.favorite(course.id)), 'co_favError')}
            accessibilityRole="button" accessibilityLabel={course.favori ? t('co_unfavorite') : t('co_favorite')} style={styles.heart} disabled={busyId === course.id}>
            <Text style={styles.heartIcon}>{course.favori ? '❤️' : '🤍'}</Text>
          </Pressable>
        </Pressable>
        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <Pill label={t(`coursecat_${course.categorie}`)} tone="info" />
            {course.nb_pages ? <Text style={styles.pages}>📄 {t('co_pages', { count: course.nb_pages })}</Text> : null}
          </View>
          <Pressable onPress={() => open(course)} accessibilityRole="link"><Text style={styles.title}>{course.titre}</Text></Pressable>
          <Text style={styles.meta}>{t('co_by', { name: course.encadreur_nom })}{course.groupe_nom ? ` · ${course.groupe_nom}` : ''}</Text>
          <Text style={styles.meta}>{formatDate(course.debut_le, { dateStyle: 'medium', timeStyle: 'short' })} · {t('co_minutes', { count: course.duree_minutes })}</Text>
          {course.description ? <Text style={styles.desc}>{course.description}</Text> : null}
          <View style={styles.links}>
            {course.lieu ? <Text style={styles.meta}>📍 {course.lieu}</Text> : null}
            {course.lien_visio ? <Text style={styles.link} onPress={() => Linking.openURL(course.lien_visio)}>{t('co_join')}</Text> : null}
            <Text style={styles.meta}>{t('co_participants', { count: course.inscrits })}</Text>
          </View>
          {course.a_contenu || course.a_audio || course.a_fichier || course.description ? <Button variant="outline" label={`📖  ${t('rd_readCourse')}${course.a_audio ? '  🎧' : ''}`} onPress={() => navigation.navigate('CourseReader', { courseId: course.id })} /> : null}
          {course.inscrit && course.a_fichier ? <Button variant="outline" label={`⬇  ${t('co_download')} PDF${course.fichier_taille ? ` (${Math.max(1, Math.round(course.fichier_taille / 1024))} Ko)` : ''}`} loading={busyId === course.id} onPress={() => download(course, 'file')} /> : null}
          {course.inscrit && !course.a_fichier && course.a_contenu ? <Button variant="outline" label={`⬇  ${t('co_download')} (.txt)`} loading={busyId === course.id} onPress={() => download(course, 'text')} /> : null}
          {course.inscrit && course.a_audio ? <Button variant="outline" label={`⬇  ${t('co_download')} ${t('rd_audioTrack')}`} loading={busyId === course.id} onPress={() => download(course, 'audio')} /> : null}
          {!course.inscrit && (course.a_fichier || course.a_contenu || course.a_audio) && !cancelled ? <Text style={styles.meta}>🔒 {t('co_enrollToDownload')}</Text> : null}
          {cancelled ? <Banner>{t('coursestatus_CANCELLED')}</Banner>
            : <Button label={course.inscrit ? t('co_unenroll') : t('co_enroll')} variant={course.inscrit ? 'ghost' : 'primary'} loading={busyId === course.id} onPress={() => run(course, () => (course.inscrit ? api.courses.unenroll(course.id) : api.courses.enroll(course.id)), 'co_enrollError')} />}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <Heading kicker={t('co_kicker')} title={t('courses')} subtitle={t('co_subtitlePilgrim')} />
      <Field value={search} onChangeText={setSearch} placeholder={`🔍  ${t('co_searchPlaceholder')}`} accessibilityLabel={t('co_searchPlaceholder')} autoCapitalize="none" returnKeyType="search" clearButtonMode="while-editing" />
      <Chips value={tab} onChange={setTab} options={[{ value: 'all', label: t('co_tabAll') }, { value: 'favorites', label: `♥ ${t('co_tabFavorites')}` }]} />
      {error && !data ? <Banner>{t('co_loadError')}</Banner> : null}
      <Banner>{failure}</Banner>
      {loading ? <Loader /> : (
        <>
          {upcoming.length === 0 && past.length === 0 ? <Empty>{query ? t('co_noResults', { query: search.trim() }) : tab === 'favorites' ? t('co_noFavorites') : t('co_nonePilgrim')}</Empty> : upcoming.length === 0 ? null : upcoming.map((course) => renderCourse(course, false))}
          {past.length > 0 ? <><SectionTitle>{t('co_past')}</SectionTitle>{past.map((course) => renderCourse(course, true))}</> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, borderWidth: 1, borderColor: THEME.colors.border, overflow: 'hidden' },
  cover: { height: 150, backgroundColor: THEME.colors.primary, alignItems: 'center', justifyContent: 'center' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { fontSize: 46 },
  heart: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  heartIcon: { fontSize: 19 },
  body: { padding: THEME.spacing.md, gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pages: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  desc: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  link: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary, textDecorationLine: 'underline' },
});
