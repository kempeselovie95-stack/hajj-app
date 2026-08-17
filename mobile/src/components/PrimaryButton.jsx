import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

export default function PrimaryButton({ label, onPress, isLoading = false, disabled = false }) {
  const isDisabled = disabled || isLoading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={THEME.colors.textOnPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: THEME.colors.primaryHover },
  disabled: { opacity: 0.6 },
  label: {
    fontFamily: FONTS.bodySemibold,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textOnPrimary,
  },
});
