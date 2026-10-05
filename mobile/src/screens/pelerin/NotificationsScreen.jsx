import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useNotifications } from '../../contexts/NotificationsContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useDataSync } from '../../sync/DataSyncContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import NotificationCard from '../../components/NotificationCard.jsx';
import SwipeRow from '../../ui/SwipeRow.jsx';
import { useConfirm } from '../../ui/ConfirmContext.jsx';
import { Banner, Chips } from '../../ui/index.jsx';

export default function NotificationsScreen() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const { t } = useLanguage();
  const { bump } = useDataSync();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState('');
  const data = filter === 'unread' ? notifications.filter((item) => !item.lue) : notifications;

  // Glisser vers la gauche → bouton rouge → fenêtre de confirmation → suppression.
  async function askDelete(item, closeRow) {
    const accepted = await confirm({ title: t('nt_deleteTitle'), message: t('nt_deleteText'), confirmLabel: t('nt_delete'), danger: true });
    if (!accepted) { closeRow(); return; }
    setFailure('');
    try { await removeNotification(item.id); } catch { setFailure(t('nt_deleteError')); closeRow(); }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{t('notificationsTitle')}</Text>
          <Text style={styles.subtitle}>{unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allCaughtUp')}</Text>
        </View>
        {unreadCount > 0 ? <Pressable onPress={markAllAsRead}><Text style={styles.markAll}>{t('markAllRead')}</Text></Pressable> : null}
      </View>
      <View style={styles.filters}>
        <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: t('allNotifications') }, { value: 'unread', label: t('unreadNotifications') }]} />
        {notifications.length > 0 ? <Text style={styles.hint}>{t('nt_swipeHint')}</Text> : null}
        <Banner>{failure}</Banner>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); bump(); setTimeout(() => setRefreshing(false), 800); }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <SwipeRow actionLabel={t('nt_delete')} onAction={(closeRow) => askDelete(item, closeRow)}>
            <NotificationCard notification={item} onPress={() => markAsRead(item.id)} />
          </SwipeRow>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{filter === 'unread' ? t('np_noneUnread') : t('np_noneAll')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: THEME.spacing.lg, paddingBottom: THEME.spacing.sm, gap: 12 },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary, marginTop: 2 },
  markAll: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
  filters: { paddingHorizontal: THEME.spacing.lg, paddingBottom: THEME.spacing.sm, gap: 8 },
  hint: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: THEME.colors.textSecondary },
  list: { paddingBottom: THEME.spacing.xl },
  separator: { height: 1, backgroundColor: THEME.colors.border },
  empty: { textAlign: 'center', padding: THEME.spacing.xl, fontFamily: FONTS.bodyRegular, color: THEME.colors.textSecondary },
});
