import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useNotifications } from '../../contexts/NotificationsContext.jsx';
import { useGroupUnread } from '../../hooks/useGroupUnread.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Screen, Heading, Card } from '../../ui/index.jsx';

/** Menu « Plus » : voyage, carte, discussion de groupe, notifications, paramètres. */
export default function MoreScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const groupUnread = useGroupUnread().total;
  const navigation = useNavigation();

  const entries = [
    { screen: 'Trip', emoji: '🧭', label: t('travel'), hint: t('trip_subtitle') },
    { screen: 'Map', emoji: '🗺️', label: t('mp_title'), hint: t('mp_subtitle') },
    { screen: 'MyGroup', emoji: '💬', label: t('gc_title'), hint: t('gc_kicker'), badge: groupUnread },
    { screen: 'Notifications', emoji: '🔔', label: t('notificationsTitle'), badge: unreadCount },
    { screen: 'Settings', emoji: '⚙️', label: t('settings'), hint: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() },
  ];

  return (
    <Screen>
      <Heading title={t('more_title')} subtitle={t('more_subtitle')} />
      <Card style={styles.list}>
        {entries.map((entry, index) => (
          <Pressable key={entry.screen} onPress={() => navigation.navigate(entry.screen)} accessibilityRole="button" style={[styles.row, index > 0 && styles.border]}>
            <Text style={styles.emoji}>{entry.emoji}</Text>
            <View style={styles.flex1}>
              <Text style={styles.label}>{entry.label}</Text>
              {entry.hint ? <Text style={styles.hint} numberOfLines={1}>{entry.hint}</Text> : null}
            </View>
            {entry.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{entry.badge}</Text></View> : null}
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 0, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: THEME.spacing.md },
  border: { borderTopWidth: 1, borderTopColor: THEME.colors.border },
  flex1: { flex: 1 },
  emoji: { fontSize: 26 },
  label: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base, color: THEME.colors.textPrimary },
  hint: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: THEME.colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 11 },
  chevron: { fontSize: 24, color: THEME.colors.textSecondary },
});
