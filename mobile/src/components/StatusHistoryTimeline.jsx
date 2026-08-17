import { View, Text, StyleSheet } from 'react-native';
import { DOSSIER_STATUS_LABELS, formatDateTime, THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

/**
 * Équivalent RN de web/src/components/dossiers/StatusHistoryTimeline.jsx —
 * même contrat de données (entries), lecture seule.
 *
 * @param {{ entries: Array<{id: number|string, ancien_statut: string|null, nouveau_statut: string, modifie_par_nom: string, created_at: string}> }} props
 */
export default function StatusHistoryTimeline({ entries = [] }) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>Aucun historique disponible.</Text>;
  }

  const sorted = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <View>
      {sorted.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.transition}>
              {entry.ancien_statut ? (
                <>
                  <Text style={styles.fromStatus}>{DOSSIER_STATUS_LABELS[entry.ancien_statut]}</Text>
                  {' → '}
                  <Text style={styles.toStatus}>{DOSSIER_STATUS_LABELS[entry.nouveau_statut]}</Text>
                </>
              ) : (
                <Text style={styles.toStatus}>{DOSSIER_STATUS_LABELS[entry.nouveau_statut]}</Text>
              )}
            </Text>
            <Text style={styles.meta}>
              {formatDateTime(entry.created_at)} · {entry.modifie_par_nom}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
  },
  row: { flexDirection: 'row', gap: THEME.spacing.sm + 2, marginBottom: THEME.spacing.md },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
    marginTop: 6,
  },
  content: { flex: 1 },
  transition: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textPrimary },
  fromStatus: { color: THEME.colors.textSecondary },
  toStatus: { fontFamily: FONTS.bodySemibold, color: THEME.colors.textPrimary },
  meta: {
    fontFamily: FONTS.monoRegular,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});
