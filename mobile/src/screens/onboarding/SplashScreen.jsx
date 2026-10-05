import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../../hooks/useAppFonts.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import GeometricPattern from '../../components/GeometricPattern.jsx';

/**
 * Écran de démarrage animé (logo, nom, accroche). Affiché pendant le chargement de la session
 * et des polices ; le logo apparaît en fondu avec un léger effet de ressort.
 */
export default function SplashScreen() {
  const { t } = useLanguage();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const tagline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(tagline, { toValue: 1, duration: 700, delay: 500, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, tagline]);

  return (
    <View style={styles.container}>
      <GeometricPattern />
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logo}><Text style={styles.logoText}>🕋</Text></View>
        <Text style={styles.name}>MyHajj237</Text>
        <Text style={styles.country}>CAMEROUN</Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: tagline }]}>{t('splash_tagline')}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.primary, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 10 },
  logo: { width: 112, height: 112, borderRadius: 32, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  logoText: { fontSize: 56 },
  name: { fontFamily: FONTS.displayBold ?? FONTS.displaySemibold, fontSize: 34, color: THEME.colors.textOnPrimary, marginTop: 6 },
  country: { fontFamily: FONTS.monoRegular, fontSize: 12, letterSpacing: 6, color: THEME.colors.accent },
  tagline: { position: 'absolute', bottom: 64, fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.sm, color: 'rgba(250,247,240,0.85)' },
});
