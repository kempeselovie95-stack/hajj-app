import { View, Text, StyleSheet } from 'react-native';
import { DOSSIER_STATUS_FLOW, DOSSIER_STATUS_LABELS, THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

/**
 * Timeline verticale du parcours standard d'un dossier (DOSSIER_STATUS_FLOW).
 * `currentStatus` détermine quelles étapes sont déjà franchies — le
 * composant ne connaît rien du dossier lui-même, juste son statut actuel.
 */
export default function DossierTimeline({ currentStatus }) {
  const currentIndex = DOSSIER_STATUS_FLOW.indexOf(currentStatus);

  return (
    <View>
      {DOSSIER_STATUS_FLOW.map((status, index) => {
        const isDone = currentIndex >= 0 && index <= currentIndex;
        const isLast = index === DOSSIER_STATUS_FLOW.length - 1;

        return (
          <View key={status} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.dot, isDone && styles.dotDone]} />
              {!isLast && <View style={[styles.line, isDone && styles.lineDone]} />}
            </View>
            <Text style={[styles.label, isDone && styles.labelDone]}>
              {DOSSIER_STATUS_LABELS[status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  markerColumn: { alignItems: 'center', width: DOT_SIZE + THEME.spacing.md },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: THEME.colors.neutralTint,
    borderWidth: 2,
    borderColor: THEME.colors.neutral,
  },
  dotDone: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  line: {
    width: 2,
    flex: 1,
    minHeight: THEME.spacing.lg,
    backgroundColor: THEME.colors.neutralTint,
    marginVertical: 2,
  },
  lineDone: { backgroundColor: THEME.colors.primary },
  label: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textSecondary,
    paddingBottom: THEME.spacing.md,
  },
  labelDone: { fontFamily: FONTS.bodySemibold, color: THEME.colors.textPrimary },
});
