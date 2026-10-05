import { Text } from 'react-native';
import { THEME } from '@hajj/shared';
import { FONTS } from '../hooks/useAppFonts.js';

/** Options communes des barres d'onglets (couleurs du design system, police, icône emoji). */
export function tabScreenOptions() {
  return {
    headerShown: false,
    tabBarActiveTintColor: THEME.colors.primary,
    tabBarInactiveTintColor: THEME.colors.textSecondary,
    tabBarStyle: { backgroundColor: THEME.colors.surface, borderTopColor: THEME.colors.border },
    tabBarLabelStyle: { fontFamily: FONTS.bodyMedium, fontSize: 11 },
    tabBarBadgeStyle: { backgroundColor: THEME.colors.danger, fontFamily: FONTS.bodySemibold },
  };
}

export const tabIcon = (emoji) => ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
