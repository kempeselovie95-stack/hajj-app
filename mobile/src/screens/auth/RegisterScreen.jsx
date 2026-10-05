import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import { validateRegistration, hasErrors } from '../../validation.js';
import FormField from '../../components/FormField.jsx';
import LanguagePicker from '../../components/LanguagePicker.jsx';
import GoogleButton from '../../components/GoogleButton.jsx';
import { Banner, Button } from '../../ui/index.jsx';

const INITIAL_FORM = { nom: '', prenom: '', email: '', telephone: '', password: '', confirmation: '' };

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { t } = useLanguage();
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
    const validation = validateRegistration(form);
    setErrors(validation);
    if (hasErrors(validation)) return;
    setIsSubmitting(true);
    try {
      const { confirmation, password, ...identity } = form;
      await register({ ...identity, mot_de_passe: password });
    } catch (err) {
      setServerError(err.status === 409 ? t('duplicateEmail') : t('registrationError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const err = (key) => (errors[key] ? t(errors[key]) : null);
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LanguagePicker />
        <Text style={styles.title}>{t('registerTitle')}</Text>
        <Text style={styles.subtitle}>{t('registerSubtitle')}</Text>
        <View style={styles.card}>
          <Banner>{serverError}</Banner>
          <FormField label={t('lastName')} value={form.nom} onChangeText={(v) => updateField('nom', v)} error={err('nom')} autoCapitalize="words" required />
          <FormField label={t('firstName')} value={form.prenom} onChangeText={(v) => updateField('prenom', v)} error={err('prenom')} autoCapitalize="words" required />
          <FormField label={t('emailField')} value={form.email} onChangeText={(v) => updateField('email', v)} error={err('email')} keyboardType="email-address" required />
          <FormField label={t('phone')} value={form.telephone} onChangeText={(v) => updateField('telephone', v)} error={err('telephone')} placeholder="6XXXXXXXX" keyboardType="phone-pad" required />
          <FormField label={t('passwordField')} value={form.password} onChangeText={(v) => updateField('password', v)} error={err('password')} secureTextEntry required />
          <FormField label={t('confirmPassword')} value={form.confirmation} onChangeText={(v) => updateField('confirmation', v)} error={err('confirmation')} secureTextEntry required />
          <Button label={isSubmitting ? t('registering') : t('register')} onPress={handleSubmit} loading={isSubmitting} />
          <GoogleButton />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('existingAccount')} </Text>
          <Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.footerLink}>{t('signIn')}</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: THEME.spacing.lg, gap: THEME.spacing.sm },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary, textAlign: 'center', marginTop: THEME.spacing.md },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: THEME.colors.textSecondary, textAlign: 'center', marginBottom: THEME.spacing.md },
  card: { backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, borderWidth: 1, borderColor: THEME.colors.border, padding: THEME.spacing.lg, gap: THEME.spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: THEME.spacing.md },
  footerText: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  footerLink: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
});
