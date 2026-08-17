import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

/**
 * Feuille d'action simple (pas de dépendance à une lib de bottom-sheet
 * tierce) proposant les 3 sources possibles pour un document. Le choix
 * de la source réelle (caméra/galerie/fichier) est délégué au parent
 * via les callbacks — ce composant ne connaît que la présentation.
 *
 * @param {{ isVisible: boolean, documentLabel: string, onClose: () => void, onPickCamera: () => void, onPickGallery: () => void, onPickFile: () => void }} props
 */
export default function UploadActionSheet({
  isVisible,
  documentLabel,
  onClose,
  onPickCamera,
  onPickGallery,
  onPickFile,
}) {
  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.title}>{documentLabel}</Text>
          <Text style={styles.subtitle}>Choisis comment ajouter ce document</Text>

          <SheetOption label="📷  Prendre une photo" onPress={onPickCamera} />
          <SheetOption label="🖼️  Choisir depuis la galerie" onPress={onPickGallery} />
          <SheetOption label="📄  Choisir un fichier (PDF)" onPress={onPickFile} />

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetOption({ label, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.option, pressed && styles.optionPressed]} onPress={onPress}>
      <Text style={styles.optionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 36, 31, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.radius.lg,
    borderTopRightRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
  },
  title: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes.lg,
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.lg,
  },
  option: {
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  optionPressed: { backgroundColor: THEME.colors.surfaceMuted },
  optionLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  cancelButton: { marginTop: THEME.spacing.md, alignItems: 'center' },
  cancelText: {
    fontFamily: FONTS.bodySemibold,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.danger,
  },
});
