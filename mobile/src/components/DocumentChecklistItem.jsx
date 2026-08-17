import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DOCUMENT_STATUS, THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';
import StatusBadge from './StatusBadge.jsx';

/**
 * @param {{
 *   label: string,
 *   document: {statut: string, motif_rejet?: string}|null,
 *   isUploading: boolean,
 *   onPressAdd: () => void,
 * }} props
 */
export default function DocumentChecklistItem({ label, document, isUploading, onPressAdd }) {
  const isMissing = !document;
  const canReupload = isMissing || document?.statut === DOCUMENT_STATUS.REJETE;

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>

        {isMissing ? (
          <Text style={styles.hint}>Pas encore transmis</Text>
        ) : document.statut === DOCUMENT_STATUS.REJETE && document.motif_rejet ? (
          <Text style={styles.rejectReason}>Motif : {document.motif_rejet}</Text>
        ) : null}

        {isMissing ? (
          <StatusBadge label="Manquant" semantic="neutral" />
        ) : (
          <View style={styles.badgeSpacing}>
            <StatusBadge
              label={
                document.statut === DOCUMENT_STATUS.VALIDE
                  ? 'Validé'
                  : document.statut === DOCUMENT_STATUS.REJETE
                  ? 'Rejeté'
                  : 'En attente'
              }
              semantic={
                document.statut === DOCUMENT_STATUS.VALIDE
                  ? 'success'
                  : document.statut === DOCUMENT_STATUS.REJETE
                  ? 'danger'
                  : 'warning'
              }
            />
          </View>
        )}
      </View>

      {canReupload && (
        <Pressable
          onPress={onPressAdd}
          disabled={isUploading}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
            isUploading && styles.addButtonDisabled,
          ]}
        >
          <Text style={styles.addButtonLabel}>{isUploading ? '…' : 'Ajouter'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  info: { flex: 1, paddingRight: THEME.spacing.md },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  hint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  rejectReason: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.danger,
    marginBottom: 6,
  },
  badgeSpacing: { marginTop: 2 },
  addButton: {
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addButtonPressed: { backgroundColor: THEME.colors.primaryTint },
  addButtonDisabled: { opacity: 0.5 },
  addButtonLabel: {
    fontFamily: FONTS.bodySemibold,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.primary,
  },
});
