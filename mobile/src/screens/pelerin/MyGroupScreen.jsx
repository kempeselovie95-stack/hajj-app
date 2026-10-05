import { StyleSheet, View } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import { useLive } from '../../hooks/useLive.js';
import { Banner, Empty, Loader } from '../../ui/index.jsx';
import GroupChatScreen from '../encadreur/GroupChatScreen.jsx';

/** Discussion du groupe auquel le pèlerin est affecté (même fil que celui de son guide). */
export default function MyGroupScreen() {
  const { api } = useAuth();
  const { t } = useLanguage();
  const { data, loading, error } = useLive(() => api.operations.myTrip().then((trip) => trip.groupe), [api]);

  if (loading) return <View style={styles.pad}><Loader /></View>;
  if (error && !data) return <View style={styles.pad}><Banner>{t('gc_loadError')}</Banner></View>;
  if (!data) return <View style={styles.pad}><Empty>{t('gc_none')}</Empty></View>;
  return <GroupChatScreen groupId={data.id} groupName={`${data.nom}${data.guide ? ` · ${data.guide}` : ''}`} />;
}

const styles = StyleSheet.create({ pad: { flex: 1, padding: THEME.spacing.lg, backgroundColor: THEME.colors.background } });
