import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ROLES } from '@hajj/shared';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import AuthStack from './AuthStack.jsx';
import MainTabs from './MainTabs.jsx';
import EncadreurTabs from './EncadreurTabs.jsx';

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  usePushNotifications(); // no-op tant que isAuthenticated est false

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.background }}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? user?.role === ROLES.ENCADREUR ? <EncadreurTabs /> : <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
