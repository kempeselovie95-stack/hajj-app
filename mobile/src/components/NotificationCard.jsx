import { Pressable, View, Text, StyleSheet } from 'react-native';
import { NOTIFICATION_TYPE_ICON, formatRelativeTime, THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

export default function NotificationCard({ notification, onPress }) {
  const { type, titre, message, lue, created_at } = notification;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !lue && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon}>{NOTIFICATION_TYPE_ICON[type] ?? 'ℹ️'}</Text>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{titre}</Text>
          {!lue && <View style={styles.dot} />}
        </View>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.time}>{formatRelativeTime(created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.md,
  },
  unread: { backgroundColor: THEME.colors.primaryTint },
  pressed: { opacity: 0.85 },
  icon: { fontSize: 20, lineHeight: 24 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: FONTS.bodySemibold,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.primary },
  message: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontFamily: FONTS.monoRegular,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
});
