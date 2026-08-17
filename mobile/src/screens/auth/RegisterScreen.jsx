import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { validateRegisterForm, isFormValid, THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import FormField from '../../components/FormField.jsx';
import PrimaryButton from '../../components/PrimaryButton.jsx';

const INITIAL_FORM = { nom: '', prenom: '', email: '', telephone: '', password: '', confirmation: '' };

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  async function handleSubmit() {
    setServerError(null);
    const validation = validateRegisterForm(form);
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setIsSubmitting(true);
    try {
      const { confirmation, ...payload } = form;
      await register(payload);
      // RootNavigator bascule automatiquement vers MainTabs une fois connecté.
    } catch (err) {
      setServerError(err.message || 'Impossible de créer le compte. Réessaie.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Renseigne tes informations pour démarrer ton dossier.</Text>

        <View style={styles.card}>
          {serverError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          )}

          <FormField label="Nom" value={form.nom} onChangeText={(v) => updateField('nom', v)} error={errors.nom} autoCapitalize="words" required />
          <FormField label="Prénom" value={form.prenom} onChangeText={(v) => updateField('prenom', v)} error={errors.prenom} autoCapitalize="words" required />
          <FormField label="Email" value={form.email} onChangeText={(v) => updateField('email', v)} error={errors.email} keyboardType="email-address" required />
          <FormField label="Téléphone" value={form.telephone} onChangeText={(v) => updateField('telephone', v)} error={errors.telephone} placeholder="6XXXXXXXX" keyboardType="phone-pad" required />
          <FormField label="Mot de passe" value={form.password} onChangeText={(v) => updateField('password', v)} error={errors.password} secureTextEntry required />
          <FormField label="Confirmer le mot de passe" value={form.confirmation} onChangeText={(v) => updateField('confirmation', v)} error={errors.confirmation} secureTextEntry required />

          <PrimaryButton label="Créer mon compte" onPress={handleSubmit} isLoading={isSubmitting} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: THEME.spacing.lg },
  title: {
    fontFamily: FONTS.displaySemibold,
    fontSize: THEME.typography.sizes['2xl'],
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
  errorBannerText: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: THEME.spacing.lg, marginBottom: THEME.spacing.xl },
  footerText: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  footerLink: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
});
