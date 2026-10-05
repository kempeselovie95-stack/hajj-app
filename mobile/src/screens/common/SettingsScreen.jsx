import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useConfirm } from '../../ui/ConfirmContext.jsx';
import { THEME } from '@hajj/shared';
import { readThemePreference, saveThemePreference } from '../../themeBoot.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import { Screen, Heading, Card, SectionTitle, Button, Banner, Chips, Field, Pill } from '../../ui/index.jsx';

const ROLE_KEYS = { admin: 'roleAdmin', agence: 'roleAgency', encadreur: 'roleGuide', pelerin: 'rolePilgrim' };
const RULES = [
  { key: 'length', test: (value) => value.length >= 8 },
  { key: 'upper', test: (value) => /[A-Z]/.test(value) },
  { key: 'digit', test: (value) => /[0-9]/.test(value) },
];

/** Paramètres du compte (pèlerin et guide) : profil, langue, mot de passe, déconnexion. */
export default function SettingsScreen() {
  const { user, updateProfile, logout, apiBaseUrl } = useAuth();
  const [themePref, setThemePref] = useState(readThemePreference());
  const [themeNeedsRestart, setThemeNeedsRestart] = useState(false);
  function changeTheme(next) {
    setThemePref(next);
    const reload = saveThemePreference(next);
    updateProfile({ theme: next }).catch(() => {}); // enregistré sur le compte : il suit l'utilisateur
    if (!reload) return;
    if (Platform.OS === 'web') window.location.reload();
    else setThemeNeedsRestart(true);
  }
  const { t, language, languages, setLanguage, needsRestart } = useLanguage();
  const confirm = useConfirm();
  const [form, setForm] = useState({ prenom: user?.prenom || '', nom: user?.nom || '', email: user?.email || '', telephone: user?.telephone || '' });
  const [profileState, setProfileState] = useState({ loading: false, tone: 'success', text: '' });
  const [pwd, setPwd] = useState({ ancien_mot_de_passe: '', mot_de_passe: '', confirmation: '' });
  const [pwdState, setPwdState] = useState({ loading: false, tone: 'success', text: '' });

  const rulesOk = RULES.every((rule) => rule.test(pwd.mot_de_passe));
  const matches = pwd.mot_de_passe !== '' && pwd.mot_de_passe === pwd.confirmation;

  async function saveProfile() {
    setProfileState({ loading: true, tone: 'success', text: '' });
    try { await updateProfile(form); setProfileState({ loading: false, tone: 'success', text: t('profileUpdated') }); }
    catch (error) { setProfileState({ loading: false, tone: 'danger', text: error.status === 409 ? t('duplicateEmail') : t('profileUpdateFailed') }); }
  }

  async function changePassword() {
    if (!rulesOk || !matches) return;
    setPwdState({ loading: true, tone: 'success', text: '' });
    try {
      await updateProfile({ ancien_mot_de_passe: pwd.ancien_mot_de_passe, mot_de_passe: pwd.mot_de_passe });
      setPwd({ ancien_mot_de_passe: '', mot_de_passe: '', confirmation: '' });
      setPwdState({ loading: false, tone: 'success', text: t('set_passwordChanged') });
    } catch (error) { setPwdState({ loading: false, tone: 'danger', text: error.status === 400 ? t('set_wrongPassword') : t('profileUpdateFailed') }); }
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <Screen>
      <Heading kicker={t('account')} title={t('settings')} subtitle={t('set_subtitle')} />

      <Card>
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.flex1}>
            <Text style={styles.name} numberOfLines={1}>{user?.prenom} {user?.nom}</Text>
            <Text style={styles.meta} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Pill label={t(ROLE_KEYS[user?.role] ?? 'rolePilgrim')} tone="success" />
        </View>
      </Card>

      <SectionTitle>{t('language')}</SectionTitle>
      <Card>
        <Text style={styles.meta}>{t('set_languageHint')}</Text>
        <Chips value={language} onChange={setLanguage} options={languages.map((item) => ({ value: item.code, label: item.label }))} />
        {needsRestart ? <Banner tone="warning">{t('mob_restartRtl')}</Banner> : null}
      </Card>

      <SectionTitle>{t('theme_title')}</SectionTitle>
      <Card>
        <Text style={styles.meta}>{t('theme_hint')}</Text>
        <Chips value={themePref} onChange={changeTheme} options={[{ value: 'light', label: `☀️ ${t('theme_light')}` }, { value: 'dark', label: `🌙 ${t('theme_dark')}` }, { value: 'system', label: `📱 ${t('theme_system')}` }]} />
        {themeNeedsRestart ? <Text style={styles.meta}>{t('theme_restart')}</Text> : null}
      </Card>

      <SectionTitle>{t('set_tab_profile')}</SectionTitle>
      <Card>
        <Banner tone={profileState.tone}>{profileState.text}</Banner>
        <Field label={t('firstName')} value={form.prenom} onChangeText={(value) => setForm((c) => ({ ...c, prenom: value }))} autoCapitalize="words" />
        <Field label={t('lastName')} value={form.nom} onChangeText={(value) => setForm((c) => ({ ...c, nom: value }))} autoCapitalize="words" />
        <Field label={t('emailField')} value={form.email} onChangeText={(value) => setForm((c) => ({ ...c, email: value }))} keyboardType="email-address" autoCapitalize="none" />
        <Field label={t('phone')} value={form.telephone} onChangeText={(value) => setForm((c) => ({ ...c, telephone: value }))} keyboardType="phone-pad" />
        <Button label={t('saveChanges')} loading={profileState.loading} onPress={saveProfile} />
      </Card>

      <SectionTitle>{t('set_tab_security')}</SectionTitle>
      <Card>
        <Text style={styles.meta}>{t('set_securityHint')}</Text>
        <Banner tone={pwdState.tone}>{pwdState.text}</Banner>
        <Field label={t('currentPassword')} value={pwd.ancien_mot_de_passe} onChangeText={(value) => setPwd((c) => ({ ...c, ancien_mot_de_passe: value }))} secureTextEntry autoCapitalize="none" />
        <Field label={t('newPassword')} value={pwd.mot_de_passe} onChangeText={(value) => setPwd((c) => ({ ...c, mot_de_passe: value }))} secureTextEntry autoCapitalize="none" />
        <View style={styles.rules}>{RULES.map((rule) => <Text key={rule.key} style={[styles.rule, rule.test(pwd.mot_de_passe) && { color: THEME.colors.success }]}>{rule.test(pwd.mot_de_passe) ? '✓' : '○'} {t(`set_rule_${rule.key}`)}</Text>)}</View>
        <Field label={t('confirmPassword')} value={pwd.confirmation} onChangeText={(value) => setPwd((c) => ({ ...c, confirmation: value }))} secureTextEntry autoCapitalize="none" hint={pwd.confirmation && !matches ? t('reg_confirmMismatch') : undefined} />
        <Button label={t('changePassword')} variant="outline" loading={pwdState.loading} disabled={!rulesOk || !matches || !pwd.ancien_mot_de_passe} onPress={changePassword} />
      </Card>

      <Button label={t('logout')} variant="danger" onPress={async () => { if (await confirm({ title: t('logout'), message: t('mob_signOutConfirm'), confirmLabel: t('logout'), danger: true })) logout(); }} />
      <Text style={styles.footer}>{t('mob_apiHint')} : {apiBaseUrl}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: THEME.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONTS.bodyBold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textOnPrimary },
  name: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes.lg, color: THEME.colors.textPrimary },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary },
  rules: { gap: 2 },
  rule: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: THEME.colors.textSecondary },
  footer: { fontFamily: FONTS.monoRegular, fontSize: 10, color: THEME.colors.textSecondary, textAlign: 'center' },
});
