import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { THEME } from '@hajj/shared';
import { useAppFonts } from './src/hooks/useAppFonts.js';
import { AuthProvider } from './src/contexts/AuthContext.jsx';
import { NotificationsProvider } from './src/contexts/NotificationsContext.jsx';
import RootNavigator from './src/navigation/RootNavigator.jsx';

export default function App() {
  const fontsLoaded = useAppFonts();

  // Écran vide (couleur de fond seule) pendant le chargement des polices —
  // évite le flash de police système avant bascule vers Fraunces/Plus Jakarta Sans.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: THEME.colors.background }} />;
  }

  return (
    <AuthProvider>
      <NotificationsProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </NotificationsProvider>
    </AuthProvider>
  );
}
