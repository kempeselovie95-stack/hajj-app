import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

const ToastContext = createContext({ show: () => {} });

const PALETTE = {
  success: { bg: '#E7F4EE', border: '#9BD3B8', text: '#0B5D4C', icon: '✅' },
  danger: { bg: '#FBEAE6', border: '#E9A99B', text: '#8E2B1A', icon: '⚠️' },
  warning: { bg: '#FFF4DD', border: '#EBCB84', text: '#7A5410', icon: '⚠️' },
  info: { bg: '#E8F1F6', border: '#9CC3D6', text: '#1F5673', icon: '🔔' },
  message: { bg: '#FFFFFF', border: '#D9D2C3', text: '#1B2B27', icon: '💬' },
};

/**
 * Alertes de l'application sous forme de notifications (toasts) : succès, erreurs, nouveaux messages.
 * `show(texte, ton, { titre, duree, onPress })`. Les composants <Banner> passent par ici.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const show = useCallback((text, tone = 'info', options = {}) => {
    if (!text) return;
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.filter((toast) => toast.text !== text).slice(-2), { id, text: String(text), tone, ...options }]);
    setTimeout(() => dismiss(id), options.duree ?? (tone === 'danger' ? 6000 : 4000));
  }, [dismiss]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.layer}>
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />)}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start(); }, [anim]);
  const palette = PALETTE[toast.tone] ?? PALETTE.info;
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }}>
      <Pressable accessibilityRole="alert" onPress={() => { onClose(); toast.onPress?.(); }} style={[styles.toast, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Text style={styles.icon}>{palette.icon}</Text>
        <View style={styles.flex1}>
          {toast.titre ? <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{toast.titre}</Text> : null}
          <Text style={[styles.text, { color: palette.text }]} numberOfLines={3}>{toast.text}</Text>
        </View>
        <Text style={[styles.close, { color: palette.text }]}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export function useToast() { return useContext(ToastContext); }

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: Platform.OS === 'web' ? 10 : 52, left: 12, right: 12, gap: 8, zIndex: 9999, elevation: 9999 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: THEME.radius.lg, paddingVertical: 12, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  flex1: { flex: 1 },
  icon: { fontSize: 20 },
  title: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm },
  text: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, lineHeight: 19 },
  close: { fontSize: 22, paddingHorizontal: 4 },
});
