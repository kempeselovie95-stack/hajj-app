import { View, Text, TextInput, StyleSheet } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

/**
 * Équivalent RN de web/src/components/common/FormField.jsx — même
 * contrat de props, pour garder les deux plateformes lisibles en miroir.
 */
export default function FormField({
  label,
  error,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  required = false,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, error && styles.inputError]}
        accessibilityLabel={label}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: THEME.spacing.md },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs + 2,
  },
  required: { color: THEME.colors.danger },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm + 2,
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textPrimary,
  },
  inputError: { borderColor: THEME.colors.danger },
  error: {
    marginTop: THEME.spacing.xs,
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.danger,
  },
});
