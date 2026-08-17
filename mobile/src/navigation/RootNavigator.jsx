import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { THEME } from '@hajj/shared';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import AuthStack from './AuthStack.jsx';
import MainTabs from './MainTabs.jsx';

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
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
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
