import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

export default function ProgressBar({ percent, label }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.labelText}>{label}</Text>
          <Text style={styles.percentText}>{clamped}%</Text>
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs + 2,
  },
  labelText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
  },
  percentText: {
    fontFamily: FONTS.monoRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
  },
  track: {
    height: 8,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.primary,
  },
});
