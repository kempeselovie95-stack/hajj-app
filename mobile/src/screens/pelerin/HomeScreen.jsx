import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useNotifications } from '../../contexts/NotificationsContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { FONTS } from '../../hooks/useAppFonts.js';
import ProgressBar from '../../components/ProgressBar.jsx';
import { Screen, Heading, Card, SectionTitle, StatCard, Pill, Empty, Loader, Banner } from '../../ui/index.jsx';

const STATUS_TONE = { brouillon: 'neutral', soumis: 'info', en_verification: 'warning', valide: 'success', transmis_nusuk: 'info', confirme: 'success', rejete: 'danger', annule: 'neutral' };

/** Accueil du pèlerin : où j'en suis, ce qu'il me reste à faire, mes prochains rendez-vous. */
export default function HomeScreen() {
  const { user, api } = useAuth();
  const { t, formatCurrency, formatDateTime } = useLanguage();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation();

  const { data, loading, error } = useLive(async () => {
    const [summary, trip, courses] = await Promise.all([
      api.pelerin.summary(),
      api.operations.myTrip().catch(() => null),
      api.courses.list({ a_venir: 1 }).catch(() => []),
    ]);
    return { summary, trip, courses };
  }, [api]);

  const summary = data?.summary;
  const dossier = summary?.dossier;
  const required = summary?.types_requis ?? [];
  const docs = summary?.documents ?? [];
  const byType = Object.fromEntries(docs.map((doc) => [doc.type, doc]));
  const approved = required.filter((type) => byType[type]?.statut === 'APPROVED').length;
  const sent = required.filter((type) => byType[type]).length;
  const rejected = docs.filter((doc) => doc.statut === 'REJECTED').length;
  const balance = summary?.solde;
  const courses = (data?.courses ?? []).filter((course) => course.statut === 'PUBLISHED');
  const nextEvent = data?.trip?.programme?.find((event) => event.debut_le >= new Date().toISOString().slice(0, 16));

  const steps = [];
  if (summary && !dossier) steps.push({ key: 'noDossier', text: t('pd_stepNoDossier') });
  if (dossier) {
    if (rejected) steps.push({ key: 'rejected', text: t('pd_stepRejected', { count: rejected }), tone: 'danger', to: 'Dossier' });
    if (sent < required.length) steps.push({ key: 'upload', text: t('pd_stepUpload', { count: required.length - sent }), tone: 'warning', to: 'Dossier' });
    if (['brouillon', 'rejete'].includes(dossier.statut) && sent === required.length && !rejected) steps.push({ key: 'submit', text: t('pd_stepSubmit'), tone: 'info', to: 'Dossier' });
    if (balance?.restant > 0) steps.push({ key: 'balance', text: t('pd_stepBalance', { amount: formatCurrency(balance.restant, balance.devise) }), tone: 'neutral', to: 'Dossier' });
    if (!data?.trip?.groupe) steps.push({ key: 'group', text: t('pd_stepGroup'), tone: 'neutral' });
  }

  return (
    <Screen>
      <Heading kicker={t('pd_kicker')} title={t('mob_hello', { name: user?.prenom ?? '' })} subtitle={t('pd_subtitle')}
        right={
          <Pressable onPress={() => navigation.navigate('Notifications')} accessibilityLabel={t('notificationsTitle')} style={styles.bell}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}
          </Pressable>
        } />
      {error && !summary ? <Banner>{t('mob_loadError')}</Banner> : null}
      {loading ? <Loader /> : (
        <>
          <View style={styles.grid}>
            <StatCard label={t('dossier')} value={dossier ? dossier.numero_dossier : '—'} hint={dossier ? [dossier.forfait, `Hajj ${dossier.annee_hajj}`].filter(Boolean).join(' · ') : t('md_noDossier')} onPress={() => navigation.navigate('Dossier')} />
            <StatCard label={t('md_documents')} value={`${approved}/${required.length}`} hint={t('pd_docsHint', { sent })} tone={rejected ? 'danger' : approved === required.length && required.length ? 'success' : 'neutral'} onPress={() => navigation.navigate('Dossier')} />
            <StatCard label={t('md_remaining')} value={balance ? formatCurrency(balance.restant, balance.devise) : '—'} hint={balance ? t('pd_paidHint', { amount: formatCurrency(balance.paye, balance.devise) }) : ''} tone={balance?.restant > 0 ? 'warning' : 'success'} onPress={() => navigation.navigate('Dossier')} />
            <StatCard label={t('pd_nextCourse')} value={courses[0] ? courses[0].titre : '—'} hint={courses[0] ? formatDateTime(courses[0].debut_le) : t('pd_noCourse')} onPress={() => navigation.navigate('Courses')} />
          </View>

          {dossier ? (
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{t('md_title')}</Text>
                <Pill label={t(`status_${dossier.statut}`)} tone={STATUS_TONE[dossier.statut]} />
              </View>
              <ProgressBar percent={required.length ? Math.round((approved / required.length) * 100) : 0} label={t('pd_progress')} />
            </Card>
          ) : null}

          <SectionTitle>{t('pd_nextSteps')}</SectionTitle>
          {steps.length === 0 ? <Empty>{t('pd_allDone')}</Empty> : steps.map((step) => (
            <Pressable key={step.key} disabled={!step.to} onPress={() => navigation.navigate(step.to)}>
              <Banner tone={step.tone === 'danger' ? 'danger' : step.tone === 'warning' ? 'warning' : step.tone === 'info' ? 'info' : 'neutral'}>{step.text}</Banner>
            </Pressable>
          ))}

          <SectionTitle>{t('pd_upcoming')}</SectionTitle>
          {!nextEvent && courses.length === 0 ? <Empty>{t('pd_nothingPlanned')}</Empty> : (
            <Card>
              {nextEvent ? <View><Text style={styles.itemTitle}>{nextEvent.titre}</Text><Text style={styles.itemMeta}>{formatDateTime(nextEvent.debut_le)}{nextEvent.lieu ? ` · ${nextEvent.lieu}` : ''}</Text></View> : null}
              {courses.slice(0, 3).map((course) => (
                <View key={course.id}><Text style={styles.itemTitle}>{course.titre}</Text><Text style={styles.itemMeta}>{t(`coursecat_${course.categorie}`)} · {formatDateTime(course.debut_le)}{course.inscrit ? ` · ${t('co_enrolled')}` : ''}</Text></View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: THEME.spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  itemTitle: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  itemMeta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary, marginTop: 2 },
  bell: { padding: 8 },
  bellIcon: { fontSize: 22 },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: THEME.colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bodyBold },
});
