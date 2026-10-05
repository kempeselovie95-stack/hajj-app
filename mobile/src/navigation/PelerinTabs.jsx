import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import HomeScreen from '../screens/pelerin/HomeScreen.jsx';
import DossierScreen from '../screens/pelerin/DossierScreen.jsx';
import TripScreen from '../screens/pelerin/TripScreen.jsx';
import CoursesScreen from '../screens/pelerin/CoursesScreen.jsx';
import NewsScreen from '../screens/pelerin/NewsScreen.jsx';
import MapScreen from '../screens/pelerin/MapScreen.jsx';
import MyGroupScreen from '../screens/pelerin/MyGroupScreen.jsx';
import MoreScreen from '../screens/pelerin/MoreScreen.jsx';
import CourseReaderScreen from '../screens/pelerin/CourseReaderScreen.jsx';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import { useGroupUnread } from '../hooks/useGroupUnread.js';
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('dashboard'), tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="News" component={NewsScreen} options={{ title: t('nw_title'), tabBarIcon: tabIcon('🎞️') }} />
      <Tab.Screen name="Dossier" component={DossierScreen} options={{ title: t('dossier'), tabBarIcon: tabIcon('📄') }} />
      <Tab.Screen name="Courses" component={CoursesScreen} options={{ title: t('courses'), tabBarIcon: tabIcon('📚') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: t('more_title'), tabBarIcon: tabIcon('☰'), tabBarBadge: unreadCount + groupUnread > 0 ? unreadCount + groupUnread : undefined }} />
    </Tab.Navigator>
  );
}

/** Espace pèlerin : 5 onglets (accueil, actualités, dossier, cours, plus) + écrans empilés (voyage, carte, groupe, lecteur de cours, paramètres, notifications). */
export default function PelerinTabs() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Trip" component={TripScreen} options={{ title: t('travel'), headerBackTitle: t('c_back') }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: t('mp_title'), headerBackTitle: t('c_back') }} />
      <Stack.Screen name="MyGroup" component={MyGroupScreen} options={{ title: t('gc_title'), headerBackTitle: t('c_back') }} />
      <Stack.Screen name="CourseReader" component={CourseReaderScreen} options={{ title: t('rd_readCourse'), headerBackTitle: t('c_back') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings'), headerBackTitle: t('c_back') }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notificationsTitle'), headerBackTitle: t('c_back') }} />
    </Stack.Navigator>
  );
}
