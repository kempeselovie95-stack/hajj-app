import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../../hooks/useAppFonts.js';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import LanguagePicker from '../../components/LanguagePicker.jsx';
import { Button } from '../../ui/index.jsx';

const SLIDES = [
  { key: '1', emoji: '🕋', bg: '#E3F0EC', ring: '#0B5D4C' },
  { key: '2', emoji: '📄', bg: '#F6EEDC', ring: '#C79A3D' },
  { key: '3', emoji: '🧭', bg: '#E7F1F5', ring: '#2E6F8E' },
];

/** Carrousel d'accueil en 3 écrans, affiché une seule fois au premier lancement. */
export default function OnboardingScreen({ onDone }) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const goTo = (next) => { listRef.current?.scrollToIndex({ index: next, animated: true }); setIndex(next); };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <LanguagePicker />
        {!isLast ? <Pressable onPress={onDone} accessibilityRole="button" style={styles.skip}><Text style={styles.skipText}>{t('ob_skip')}</Text></Pressable> : <View style={styles.skip} />}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slide) => slide.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.illustration, { backgroundColor: item.bg, borderColor: item.ring }]}>
              <View style={[styles.innerRing, { borderColor: item.ring }]}><Text style={styles.emoji}>{item.emoji}</Text></View>
            </View>
            <Text style={styles.title}>{t(`ob_t${item.key}`)}</Text>
            <Text style={styles.description}>{t(`ob_d${item.key}`)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />)}
        </View>
        <Button label={isLast ? t('ob_start') : t('ob_next')} onPress={() => (isLast ? onDone() : goTo(index + 1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, paddingTop: 54 },
  top: { paddingHorizontal: THEME.spacing.lg, gap: 8, minHeight: 84 },
  skip: { alignSelf: 'flex-end', paddingVertical: 6, minHeight: 32 },
  skipText: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: THEME.spacing.xl, gap: THEME.spacing.md },
  illustration: { width: 236, height: 236, borderRadius: 118, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: THEME.spacing.md },
  innerRing: { width: 164, height: 164, borderRadius: 82, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  emoji: { fontSize: 78 },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary, textAlign: 'center' },
  description: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: THEME.colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: THEME.spacing.lg, paddingBottom: THEME.spacing.xl, gap: THEME.spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.border },
  dotActive: { width: 26, backgroundColor: THEME.colors.primary },
});
