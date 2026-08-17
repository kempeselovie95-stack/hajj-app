import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { validateLoginForm, isFormValid, THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import FormField from '../../components/FormField.jsx';
import PrimaryButton from '../../components/PrimaryButton.jsx';
import GeometricPattern from '../../components/GeometricPattern.jsx';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit() {
    setServerError(null);
    const validation = validateLoginForm(form);
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setIsSubmitting(true);
    try {
      await login(form.email, form.password);
      // La navigation vers l'espace pèlerin est automatique : RootNavigator
      // observe `isAuthenticated` et bascule de AuthStack vers MainTabs.
    } catch (err) {
      setServerError(
        err.status === 401
          ? 'Email ou mot de passe incorrect.'
          : err.message || 'Une erreur est survenue. Réessaie.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <GeometricPattern />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>GESTION DU PÈLERINAGE</Text>
        <Text style={styles.title}>Bienvenue</Text>
        <Text style={styles.subtitle}>Connecte-toi pour suivre ton dossier.</Text>

        <View style={styles.card}>
          {serverError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          <FormField
            label="Email"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            error={errors.email}
            placeholder="nom@exemple.com"
            keyboardType="email-address"
            required
          />

          <FormField
            label="Mot de passe"
            value={form.password}
            onChangeText={(v) => updateField('password', v)}
            error={errors.password}
            placeholder="••••••••"
            secureTextEntry
            required
          />

          <PrimaryButton
            label="Se connecter"
            onPress={handleSubmit}
            isLoading={isSubmitting}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nouveau pèlerin ? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Créer un compte</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  eyebrow: {
    fontFamily: FONTS.monoRegular,
    fontSize: THEME.typography.sizes.xs,
    letterSpacing: 2,
    color: THEME.colors.accent,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  title: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes['3xl'],
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.xl,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
  },
  errorBanner: {
    backgroundColor: THEME.colors.dangerTint,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.danger,
    padding: THEME.spacing.sm + 4,
    marginBottom: THEME.spacing.md,
  },
  errorBannerText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.danger,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.lg,
  },
  footerText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
  },
  footerLink: {
    fontFamily: FONTS.bodySemibold,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.primary,
  },
});
