import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EncadreurGroupsScreen from '../screens/encadreur/EncadreurGroupsScreen.jsx';
import GroupChatScreen from '../screens/encadreur/GroupChatScreen.jsx';

const Stack = createNativeStackNavigator();

export default function EncadreurTabs() {
  return <Stack.Navigator><Stack.Screen name="Groups" component={EncadreurGroupsScreen} options={{ title: 'My groups' }} /><Stack.Screen name="GroupChat" component={GroupChatScreen} options={({ route }) => ({ title: route.params?.groupName || 'Group chat' })} /></Stack.Navigator>;
}
