import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';
import { useToast } from './ToastContext.jsx';
import { useDataSync } from '../sync/DataSyncContext.jsx';

const C = THEME.colors;
const S = THEME.spacing;

/** Écran défilant avec « tirer pour actualiser » (relance toutes les lectures des écrans live). */
export function Screen({ children, contentStyle, scroll = true }) {
  const { bump } = useDataSync();
  const [refreshing, setRefreshing] = useState(false);
  if (!scroll) return <View style={[styles.screen, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.primary} onRefresh={() => { setRefreshing(true); bump(); setTimeout(() => setRefreshing(false), 800); }} />}
    >
      {children}
    </ScrollView>
  );
}

export function Heading({ kicker, title, subtitle, right }) {
  return (
    <View style={styles.heading}>
      <View style={styles.flex1}>
        {kicker ? <Text style={styles.kicker}>{String(kicker).toUpperCase()}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.85 }}>{body}</Pressable> : body;
}

export function SectionTitle({ children, action }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

const TONES = {
  neutral: { bg: C.surface, border: C.border, text: C.textPrimary },
  success: { bg: C.successTint, border: '#bfe3d0', text: C.success },
  warning: { bg: C.warningTint, border: '#ecd9aa', text: '#8a6a1f' },
  danger: { bg: C.dangerTint, border: '#efc4bd', text: C.danger },
  info: { bg: C.infoTint, border: '#c3dbe6', text: C.info },
};

export function StatCard({ label, value, hint, tone = 'neutral', onPress, style }) {
  const palette = TONES[tone] ?? TONES.neutral;
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.stat, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <Text style={styles.statLabel} numberOfLines={2}>{String(label).toUpperCase()}</Text>
      <Text style={[styles.statValue, String(value).length > 11 && { fontSize: THEME.typography.sizes.base }, String(value).length > 7 && String(value).length <= 11 && { fontSize: THEME.typography.sizes.lg }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={styles.statHint} numberOfLines={2}>{hint}</Text> : null}
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral' }) {
  const palette = TONES[tone] ?? TONES.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: tone === 'neutral' ? C.neutralTint : palette.bg }]}>
      <Text style={[styles.pillText, { color: tone === 'neutral' ? C.neutral : palette.text }]}>{label}</Text>
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, small = false, style }) {
  const off = disabled || loading;
  const v = {
    primary: { bg: C.primary, fg: C.textOnPrimary, border: C.primary },
    outline: { bg: C.surface, fg: C.primary, border: C.primary },
    danger: { bg: C.surface, fg: C.danger, border: C.danger },
    ghost: { bg: 'transparent', fg: C.textSecondary, border: C.border },
  }[variant];
  return (
    <Pressable
      onPress={onPress} disabled={off} accessibilityRole="button"
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: v.bg, borderColor: v.border }, off && { opacity: 0.55 }, pressed && !off && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.buttonText, small && { fontSize: THEME.typography.sizes.sm }, { color: v.fg }]}>{label}</Text>}
    </Pressable>
  );
}

/** Sélecteur d'une valeur parmi quelques options (onglets internes, filtres, catégories). */
export function Chips({ options, value, onChange, scroll = false }) {
  const content = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable key={String(option.value)} onPress={() => onChange(option.value)} accessibilityRole="button" accessibilityState={{ selected: active }}
        style={[styles.chip, active && styles.chipActive]}>
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
      </Pressable>
    );
  });
  return scroll
    ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{content}</ScrollView>
    : <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>{content}</View>;
}

export function Field({ label, hint, multiline, style, ...props }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.textSecondary} accessibilityLabel={label} multiline={multiline}
        style={[styles.input, multiline && { minHeight: 84, textAlignVertical: 'top' }, style]} {...props}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// Les alertes passent par le système de notifications (toast) ; un contenu non textuel reste affiché sur place.
export function Banner({ tone = 'danger', children }) {
  const toast = useToast();
  const isText = typeof children === 'string' || typeof children === 'number';
  useEffect(() => { if (isText && children !== '') toast.show(String(children), tone); }, [children, tone, isText]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!children || isText) return null;
  const palette = TONES[tone] ?? TONES.danger;
  return <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]}><Text style={[styles.bannerText, { color: palette.text }]}>{children}</Text></View>;
}

export function Empty({ children }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{children}</Text></View>;
}

export function Loader() {
  return <ActivityIndicator style={{ marginVertical: S.xl }} color={C.primary} />;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: S.sm }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: S.lg, paddingBottom: S['2xl'], gap: S.md },
  flex1: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.sm },
  kicker: { fontFamily: FONTS.monoRegular, fontSize: THEME.typography.sizes.xs, letterSpacing: 2, color: C.accent },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: C.textPrimary, marginTop: 2 },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: C.textSecondary, marginTop: 4 },
  card: { backgroundColor: C.surface, borderRadius: THEME.radius.lg, borderWidth: 1, borderColor: C.border, padding: S.md, gap: S.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm },
  sectionTitle: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: C.textPrimary },
  stat: { flex: 1, minWidth: 140, borderRadius: THEME.radius.md, borderWidth: 1, padding: S.md },
  statLabel: { fontFamily: FONTS.bodyMedium, fontSize: 11, letterSpacing: 1, color: C.textSecondary },
  statValue: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.xl, color: C.textPrimary, marginTop: 6 },
  statHint: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: C.textSecondary, marginTop: 4 },
  pill: { alignSelf: 'flex-start', borderRadius: THEME.radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.xs },
  button: { borderRadius: THEME.radius.md, borderWidth: 1, paddingVertical: 13, paddingHorizontal: S.md, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  buttonText: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.base },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: THEME.radius.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.sm, color: C.textSecondary },
  chipTextActive: { color: C.textOnPrimary },
  field: { gap: 4 },
  fieldLabel: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.xs, color: C.textSecondary },
  fieldHint: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: C.textSecondary },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: THEME.radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: C.textPrimary, backgroundColor: C.surface },
  banner: { borderRadius: THEME.radius.md, borderWidth: 1, padding: 12 },
  bannerText: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.sm },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: THEME.radius.md, padding: S.lg, alignItems: 'center' },
  emptyText: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: C.textSecondary, textAlign: 'center' },
});
