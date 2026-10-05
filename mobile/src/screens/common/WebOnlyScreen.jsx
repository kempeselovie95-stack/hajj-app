import { StyleSheet, Text, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { FONTS } from '../../hooks/useAppFonts.js';
import LanguagePicker from '../../components/LanguagePicker.jsx';
import { Button } from '../../ui/index.jsx';

/** Les rôles agence / administrateur plateforme se gèrent sur le web : l'app mobile le dit clairement. */
export default function WebOnlyScreen() {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <LanguagePicker />
      <Text style={styles.icon}>🖥️</Text>
      <Text style={styles.title}>{t('mob_webOnlyTitle')}</Text>
      <Text style={styles.text}>{t('mob_webOnlyText')}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Button label={t('logout')} variant="outline" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, padding: THEME.spacing.xl, justifyContent: 'center', gap: THEME.spacing.md },
  icon: { fontSize: 48, textAlign: 'center' },
  title: { fontFamily: FONTS.displaySemibold, fontSize: THEME.typography.sizes['2xl'], color: THEME.colors.textPrimary, textAlign: 'center' },
  text: { fontFamily: FONTS.bodyRegular, fontSize: THEME.typography.sizes.base, color: THEME.colors.textSecondary, textAlign: 'center' },
  meta: { fontFamily: FONTS.monoRegular, fontSize: THEME.typography.sizes.xs, color: THEME.colors.textSecondary, textAlign: 'center' },
});
