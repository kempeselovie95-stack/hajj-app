import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import PelerinDashboardScreen from '../screens/pelerin/PelerinDashboardScreen.jsx';
import DocumentsScreen from '../screens/pelerin/DocumentsScreen.jsx';
import NotificationsScreen from '../screens/pelerin/NotificationsScreen.jsx';
import ProfileScreen from '../screens/pelerin/ProfileScreen.jsx';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
        },
        tabBarLabelStyle: { fontFamily: FONTS.bodyMedium, fontSize: THEME.typography.sizes.xs },
        tabBarBadgeStyle: { backgroundColor: THEME.colors.danger, fontFamily: FONTS.bodySemibold },
      }}
    >
      <Tab.Screen name="Dashboard" component={PelerinDashboardScreen} options={{ title: 'Mon dossier' }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents' }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
