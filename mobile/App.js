import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { currentThemeMode } from './src/themeBoot';
import { THEME } from '@hajj/shared';
import { useAppFonts } from './src/hooks/useAppFonts.js';
import { LanguageProvider } from './src/i18n/LanguageContext.jsx';
import { DataSyncProvider } from './src/sync/DataSyncContext.jsx';
import { ConfirmProvider } from './src/ui/ConfirmContext.jsx';
import { AuthProvider } from './src/contexts/AuthContext.jsx';
import { NotificationsProvider } from './src/contexts/NotificationsContext.jsx';
import { ToastProvider } from './src/ui/ToastContext.jsx';
import RealtimeSync from './src/sync/RealtimeSync.jsx';
import RootNavigator from './src/navigation/RootNavigator.jsx';

export default function App() {
  const fontsLoaded = useAppFonts();

  // Écran vide (couleur de fond seule) pendant le chargement des polices :
  // évite le flash de police système avant bascule vers Fraunces / Plus Jakarta Sans.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: THEME.colors.background }} />;
  }

  return (
    <LanguageProvider>
      <ConfirmProvider>
      <ToastProvider>
      <DataSyncProvider>
        <AuthProvider>
          <NotificationsProvider>
            <StatusBar style={currentThemeMode === 'dark' ? 'light' : 'dark'} />
            <RealtimeSync />
            <RootNavigator />
          </NotificationsProvider>
        </AuthProvider>
      </DataSyncProvider>
      </ToastProvider>
      </ConfirmProvider>
    </LanguageProvider>
  );
}
