import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';
import { getSemanticColor } from '../theme/semanticColors.js';

export default function StatusBadge({ label, semantic = 'neutral' }) {
  const { text, bg } = getSemanticColor(semantic);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: THEME.radius.full,
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs,
  },
  label: {
    fontFamily: FONTS.bodySemibold,
    fontSize: THEME.typography.sizes.xs,
  },
});
