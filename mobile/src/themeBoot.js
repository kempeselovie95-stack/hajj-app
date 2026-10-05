/**
 * Thème clair / sombre du mobile. Ce module doit être importé EN PREMIER (index.js) :
 * il applique la palette sombre à THEME.colors avant que les écrans ne créent leurs StyleSheet.
 *  - préférence « light » | « dark » | « system » (suit l'appareil), mémorisée localement et sur le compte ;
 *  - changer de thème recharge l'application (web : rechargement de la page ; natif : au prochain lancement).
 */
import { Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { THEME, DARK_COLORS } from '@hajj/shared';

const KEY = 'hajj_theme';

export function readThemePreference() {
  try {
    const value = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : SecureStore.getItem?.(KEY);
    return ['light', 'dark', 'system'].includes(value) ? value : 'system';
  } catch { return 'system'; }
}

export function resolveThemeMode(preference = readThemePreference()) {
  if (preference === 'system') return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  return preference;
}

/** Mémorise la préférence ; retourne true si l'application doit être rechargée pour l'appliquer. */
export function saveThemePreference(preference) {
  const before = resolveThemeMode();
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, preference);
    else SecureStore.setItem?.(KEY, preference);
  } catch { /* stockage indisponible */ }
  return before !== resolveThemeMode(preference);
}

export const currentThemeMode = resolveThemeMode();
if (currentThemeMode === 'dark') Object.assign(THEME.colors, DARK_COLORS);

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.style.colorScheme = currentThemeMode;
  document.documentElement.style.backgroundColor = THEME.colors.background;
  if (document.body) document.body.style.backgroundColor = THEME.colors.background;
}
