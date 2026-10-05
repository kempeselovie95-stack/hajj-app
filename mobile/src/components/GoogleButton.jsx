import { createElement, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useToast } from '../ui/ToastContext.jsx';
import { FONTS } from '../hooks/useAppFonts.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;
const loadGoogleScript = () => {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC; script.async = true;
    script.onload = resolve; script.onerror = () => { scriptPromise = null; reject(new Error('gis')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

/**
 * « Continuer avec Google ». Sur le web (Safari / Chrome) : bouton Google Identity Services.
 * Sur mobile natif : nécessite expo-auth-session (non installé) → message explicatif.
 * L'identifiant client est fourni par le serveur (variable GOOGLE_CLIENT_ID).
 */
export default function GoogleButton() {
  const { api, loginWithGoogle } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const holder = useRef(null);
  const [clientId, setClientId] = useState(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => { api.auth.config().then((config) => setClientId(config.google_client_id || null)).catch(() => setClientId(null)); }, [api]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !clientId) return undefined;
    let cancelled = false;
    loadGoogleScript().then(() => {
      const node = holder.current;
      if (cancelled || !node) return;
      globalThis.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try { await loginWithGoogle(credential); }
          catch (error) { toast.show(error.status === 503 ? t('g_notConfigured') : t('g_error'), 'danger'); }
        },
      });
      globalThis.google.accounts.id.renderButton(node, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: language, width: 300 });
      setReady(true);
    }).catch(() => toast.show(t('g_error'), 'danger'));
    return () => { cancelled = true; };
  }, [clientId, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const showFallback = !(Platform.OS === 'web' && clientId && ready);
  function onFallbackPress() {
    if (clientId === null) toast.show(t('g_notConfigured'), 'danger');
    else if (Platform.OS !== 'web') toast.show(t('g_nativeUnavailable'), 'info');
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.separator}><View style={styles.line} /><Text style={styles.or}>{t('g_or')}</Text><View style={styles.line} /></View>
      {Platform.OS === 'web' ? createElement('div', { ref: holder, style: { display: showFallback ? 'none' : 'flex', justifyContent: 'center', minHeight: 44 } }) : null}
      {showFallback ? (
        <Pressable onPress={onFallbackPress} disabled={clientId === undefined} accessibilityRole="button" accessibilityLabel={t('g_continue')} style={styles.button}>
          <Text style={styles.g}>G</Text>
          <Text style={styles.label}>{t('g_continue')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: THEME.spacing.sm },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: THEME.colors.border },
  or: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: THEME.colors.textSecondary, textTransform: 'uppercase' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 999, paddingVertical: 12, backgroundColor: '#fff' },
  g: { fontFamily: FONTS.bodyBold, fontSize: 18, color: '#4285F4' },
  label: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textPrimary },
});
