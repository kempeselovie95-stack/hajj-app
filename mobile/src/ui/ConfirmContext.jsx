import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const ConfirmContext = createContext(() => Promise.resolve(false));

/**
 * Fenêtre de confirmation commune (déconnexion, suppression…).
 * `Alert.alert` avec des boutons ne fonctionne pas sur le web (iPhone/Safari avec `expo start --web`) :
 * ce composant marche à l'identique sur iOS, Android et le web.
 *
 * Usage : const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, danger: true })) …
 */
export function ConfirmProvider({ children }) {
  const { t } = useLanguage();
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  const close = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.overlay} onPress={() => close(false)}>
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation?.()} accessibilityRole="alert">
            <Text style={styles.title}>{dialog?.title}</Text>
            {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={() => close(false)} style={[styles.button, styles.cancel]}>
                <Text style={styles.cancelText}>{dialog?.cancelLabel ?? t('cancel')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => close(true)} style={[styles.button, dialog?.danger ? styles.danger : styles.primary]}>
                <Text style={styles.confirmText}>{dialog?.confirmLabel ?? t('cf_confirm')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,36,31,0.45)', alignItems: 'center', justifyContent: 'center', padding: THEME.spacing.lg },
  card: { width: '100%', maxWidth: 380, backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, padding: THEME.spacing.lg, gap: 10 },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  message: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  button: { flex: 1, borderRadius: THEME.radius.md, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  cancel: { backgroundColor: THEME.colors.surface, borderColor: THEME.colors.border },
  cancelText: { fontFamily: FONTS.bodySemibold, color: THEME.colors.textSecondary },
  primary: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  danger: { backgroundColor: THEME.colors.danger, borderColor: THEME.colors.danger },
  confirmText: { fontFamily: FONTS.bodySemibold, color: '#fff' },
});
