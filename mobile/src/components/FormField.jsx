import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
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
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.textSecondary}
        secureTextEntry={secureTextEntry && hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, secureTextEntry && { paddingRight: 48 }, error && styles.inputError]}
        accessibilityLabel={label}
      />
      {secureTextEntry ? (
        <Pressable onPress={() => setHidden((current) => !current)} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={styles.eye} hitSlop={8}>
          <Text style={styles.eyeIcon}>{hidden ? '👁️' : '🙈'}</Text>
        </Pressable>
      ) : null}
      </View>
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
  eye: { position: 'absolute', right: 6, top: 0, bottom: 0, width: 40, alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { fontSize: 20 },
  inputError: { borderColor: THEME.colors.danger },
  error: {
    marginTop: THEME.spacing.xs,
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.danger,
  },
});
