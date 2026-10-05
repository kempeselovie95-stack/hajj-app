import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import { validateLogin, hasErrors } from '../../validation.js';
import FormField from '../../components/FormField.jsx';
import GeometricPattern from '../../components/GeometricPattern.jsx';
import LanguagePicker from '../../components/LanguagePicker.jsx';
import GoogleButton from '../../components/GoogleButton.jsx';
import { Banner, Button } from '../../ui/index.jsx';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useLanguage();
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
    const validation = validateLogin(form);
    setErrors(validation);
    if (hasErrors(validation)) return;
    setIsSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      // RootNavigator bascule automatiquement vers l'espace du rôle une fois connecté.
    } catch (err) {
      setServerError(err.status === 401 ? t('invalidCredentials') : err.status === undefined ? t('mob_loadError') : t('loginError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GeometricPattern />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LanguagePicker />
        <Text style={styles.eyebrow}>{t('loginKicker').toUpperCase()}</Text>
        <Text style={styles.title}>{t('welcome')}</Text>
        <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

        <View style={styles.card}>
          <Banner>{serverError}</Banner>
          <FormField label={t('emailField')} value={form.email} onChangeText={(v) => updateField('email', v)} error={errors.email ? t(errors.email) : null} placeholder="nom@exemple.com" keyboardType="email-address" required />
          <FormField label={t('passwordField')} value={form.password} onChangeText={(v) => updateField('password', v)} error={errors.password ? t(errors.password) : null} placeholder="••••••••" secureTextEntry required />
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="link" style={styles.forgot}><Text style={styles.footerLink}>{t('forgotPassword')}</Text></Pressable>
          <Button label={isSubmitting ? t('signingIn') : t('signIn')} onPress={handleSubmit} loading={isSubmitting} />
          <GoogleButton />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('newPilgrim')} </Text>
          <Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.footerLink}>{t('createAccount')}</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: THEME.spacing.lg, gap: THEME.spacing.sm },
  eyebrow: { fontFamily: FONTS.monoRegular, fontSize: THEME.typography.sizes.xs, letterSpacing: 2, color: THEME.colors.accent, textAlign: 'center', marginTop: THEME.spacing.md },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['3xl'], color: THEME.colors.textPrimary, textAlign: 'center' },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: THEME.colors.textSecondary, textAlign: 'center', marginBottom: THEME.spacing.md },
  card: { backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, borderWidth: 1, borderColor: THEME.colors.border, padding: THEME.spacing.lg, gap: THEME.spacing.sm },
  forgot: { alignSelf: 'flex-end', marginBottom: THEME.spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: THEME.spacing.md },
  footerText: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.sm, color: THEME.colors.textSecondary },
  footerLink: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
});
