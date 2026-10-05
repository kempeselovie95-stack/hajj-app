import { useGroupUnread } from '../../hooks/useGroupUnread.js';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Screen, Heading, Card, SectionTitle, StatCard, Button, Empty, Loader, Banner } from '../../ui/index.jsx';

/** Accueil du guide : mes groupes, mes cours à venir, mes incidents ouverts. */
export default function GuideHomeScreen() {
  const { api, user } = useAuth();
  const { t, formatDateTime } = useLanguage();
  const navigation = useNavigation();
  const { data, loading, error } = useLive(async () => {
    const [groups, courses, incidents] = await Promise.all([
      api.groups.list().then((response) => response.groupes ?? []),
      api.courses.list({ a_venir: 1 }).catch(() => []),
      api.operations.incidents.list().catch(() => []),
    ]);
    return { groups, courses, incidents };
  }, [api]);

  const unread = useGroupUnread();
  const groups = data?.groups ?? [];
  const courses = (data?.courses ?? []).filter((course) => course.statut === 'PUBLISHED');
  const openIncidents = (data?.incidents ?? []).filter((incident) => ['OPEN', 'IN_PROGRESS'].includes(incident.statut));
  const pilgrims = groups.reduce((sum, group) => sum + Number(group.total_membres || 0), 0);

  return (
    <Screen>
      <Heading kicker={t('gd_kicker')} title={t('mob_hello', { name: user?.prenom ?? '' })} subtitle={t('gd_subtitle')} />
      {error && !data ? <Banner>{t('mob_loadError')}</Banner> : null}
      {loading ? <Loader /> : (
        <>
          <View style={styles.grid}>
            <StatCard label={t('gd_myGroups')} value={groups.length} />
            <StatCard label={t('en_pilgrims')} value={pilgrims} onPress={() => navigation.navigate('Presence')} />
            <StatCard label={t('co_upcoming')} value={courses.length} tone="success" onPress={() => navigation.navigate('Courses')} />
            <StatCard label={t('gd_openIncidents')} value={openIncidents.length} tone={openIncidents.length ? 'danger' : 'neutral'} onPress={() => navigation.navigate('Presence')} />
          </View>

          <SectionTitle>{t('gd_myGroups')}</SectionTitle>
          {groups.length === 0 ? <Empty>{t('gd_noGroups')}</Empty> : groups.map((group) => (
            <Card key={group.id} onPress={() => navigation.navigate('GroupChat', { groupId: group.id, groupName: group.nom })}>
              <View style={styles.rowBetween}><Text style={styles.name}>{group.nom}{unread.byGroup[group.id] ? `  🔴 ${unread.byGroup[group.id]}` : ''}</Text><Text style={styles.mono}>{t('gd_pilgrims', { count: Number(group.total_membres) || 0 })}</Text></View>
              <Text style={styles.meta}>{group.annee_hajj} · {group.nom_agence}</Text>
              <Text style={styles.action}>{t('gd_openChat')}</Text>
            </Card>
          ))}

          <SectionTitle action={<Button small variant="outline" label={t('co_new')} onPress={() => navigation.navigate('Courses')} />}>{t('co_upcoming')}</SectionTitle>
          {courses.length === 0 ? <Empty>{t('co_none')}</Empty> : (
            <Card>{courses.slice(0, 4).map((course) => (
              <View key={course.id} style={styles.rowBetween}>
                <View style={styles.flex1}><Text style={styles.name}>{course.titre}</Text><Text style={styles.meta}>{formatDateTime(course.debut_le)}</Text></View>
                <Text style={styles.mono}>{t('co_participants', { count: course.inscrits })}</Text>
              </View>
            ))}</Card>
          )}

          {openIncidents.length > 0 ? (
            <>
              <SectionTitle>{t('gd_openIncidents')}</SectionTitle>
              {openIncidents.slice(0, 3).map((incident) => <Banner key={incident.id}>{`${t(`inccat_${incident.categorie}`)} · ${incident.groupe_nom} — ${incident.description}`}</Banner>)}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: THEME.spacing.sm },
  flex1: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  mono: { fontFamily: FONTS.monoRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  action: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
});
