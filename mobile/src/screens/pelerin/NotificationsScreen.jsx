import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../../hooks/useAppFonts.js';
import { useNotifications } from '../../contexts/NotificationsContext.jsx';
import NotificationCard from '../../components/NotificationCard.jsx';

export default function NotificationsScreen() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <NotificationCard notification={item} onPress={() => markAsRead(item.id)} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Tu n'as pas encore de notification.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
  },
  title: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes['2xl'],
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  markAllText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.primary,
  },
  listContent: { paddingHorizontal: THEME.spacing.md, paddingBottom: THEME.spacing.xl },
  separator: { height: THEME.spacing.xs },
  emptyText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xl,
  },
});
