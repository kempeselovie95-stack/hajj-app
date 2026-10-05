import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { useGroupUnread } from '../hooks/useGroupUnread.js';
import GuideHomeScreen from '../screens/encadreur/GuideHomeScreen.jsx';
import GroupChatScreen from '../screens/encadreur/GroupChatScreen.jsx';
import PresenceScreen from '../screens/encadreur/PresenceScreen.jsx';
import GuideCoursesScreen from '../screens/encadreur/GuideCoursesScreen.jsx';
import NotificationsScreen from '../screens/pelerin/NotificationsScreen.jsx';
import SettingsScreen from '../screens/common/SettingsScreen.jsx';
import { tabScreenOptions, tabIcon } from './tabOptions.jsx';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const groupUnread = useGroupUnread().total;
  return (
    <Tab.Navigator screenOptions={tabScreenOptions()}>
      <Tab.Screen name="Home" component={GuideHomeScreen} options={{ title: t('groups'), tabBarIcon: tabIcon('👥'), tabBarBadge: groupUnread > 0 ? groupUnread : undefined }} />
      <Tab.Screen name="Presence" component={PresenceScreen} options={{ title: t('presence'), tabBarIcon: tabIcon('✅') }} />
      <Tab.Screen name="Courses" component={GuideCoursesScreen} options={{ title: t('courses'), tabBarIcon: tabIcon('📚') }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notificationsTitle'), tabBarIcon: tabIcon('🔔'), tabBarBadge: unreadCount > 0 ? unreadCount : undefined }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings'), tabBarIcon: tabIcon('⚙️') }} />
    </Tab.Navigator>
  );
}

/** Espace guide : groupes, présence / scan / incidents, cours, notifications, paramètres + discussion de groupe. */
export default function GuideTabs() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={({ route }) => ({ title: route.params?.groupName || '' })} />
    </Stack.Navigator>
  );
}
