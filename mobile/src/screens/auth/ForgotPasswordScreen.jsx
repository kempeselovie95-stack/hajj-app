import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useToast } from '../../ui/ToastContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import FormField from '../../components/FormField.jsx';
import GeometricPattern from '../../components/GeometricPattern.jsx';
import LanguagePicker from '../../components/LanguagePicker.jsx';
import { Button } from '../../ui/index.jsx';

/** Mot de passe oublié : 1) e-mail → code à 6 chiffres, 2) code + nouveau mot de passe. */
export default function ForgotPasswordScreen({ navigation }) {
  const { api } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.show(t('invalidEmail'), 'danger'); return; }
    setBusy(true);
    try {
      const result = await api.auth.forgotPassword(email.trim());
      setDevCode(result.dev_code || '');
      toast.show(t('fp_codeSent'), 'success');
      setStep('reset');
    } catch { toast.show(t('fp_error'), 'danger'); } finally { setBusy(false); }
  }

  async function reset() {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) { toast.show(t('fp_weakPassword'), 'danger'); return; }
    if (password !== confirmation) { toast.show(t('reg_confirmMismatch'), 'danger'); return; }
    setBusy(true);
    try {
      await api.auth.resetPassword({ email: email.trim(), code: code.trim(), mot_de_passe: password });
      toast.show(t('fp_done'), 'success');
      navigation.navigate('Login');
    } catch (error) {
      toast.show(error.code === 'INVALID_CODE' ? t('fp_invalidCode') : error.code === 'WEAK_PASSWORD' ? t('fp_weakPassword') : t('fp_error'), 'danger');
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GeometricPattern />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LanguagePicker />
        <Text style={styles.title}>{t('fp_title')}</Text>
        <Text style={styles.subtitle}>{step === 'email' ? t('fp_subtitleEmail') : t('fp_subtitleReset')}</Text>
        <View style={styles.card}>
          {devCode ? <Text style={styles.dev}>{t('fp_devCode', { code: devCode })}</Text> : null}
          {step === 'email' ? (
            <>
              <FormField label={t('emailField')} value={email} onChangeText={setEmail} placeholder="nom@exemple.com" keyboardType="email-address" required />
              <Button label={t('fp_sendCode')} onPress={requestCode} loading={busy} />
            </>
          ) : (
            <>
              <FormField label={t('fp_code')} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" keyboardType="number-pad" required />
              <FormField label={t('fp_newPassword')} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" required />
              <FormField label={t('confirmPassword')} value={confirmation} onChangeText={setConfirmation} secureTextEntry placeholder="••••••••" required />
              <Button label={t('fp_reset')} onPress={reset} loading={busy} />
              <Button variant="ghost" label={t('fp_resend')} onPress={() => { setStep('email'); setDevCode(''); }} />
            </>
          )}
        </View>
        <View style={styles.footer}>
          <Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.footerLink}>← {t('signIn')}</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: THEME.spacing.lg, gap: THEME.spacing.sm },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['3xl'], color: THEME.colors.textPrimary, textAlign: 'center', marginTop: THEME.spacing.md },
  subtitle: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: THEME.colors.textSecondary, textAlign: 'center', marginBottom: THEME.spacing.md },
  card: { backgroundColor: THEME.colors.surface, borderRadius: THEME.radius.lg, borderWidth: 1, borderColor: THEME.colors.border, padding: THEME.spacing.lg, gap: THEME.spacing.sm },
  dev: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.sm, color: '#7A5410', backgroundColor: '#FFF4DD', padding: 10, borderRadius: THEME.radius.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: THEME.spacing.md },
  footerLink: { fontFamily: FONTS.bodySemibold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.primary },
});
