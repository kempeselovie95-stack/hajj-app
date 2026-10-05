import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Stockage clé/valeur : SecureStore sur mobile (chiffré par l'OS),
 * localStorage sur le web (`expo start --web`, où SecureStore n'existe pas).
 */
export const storage = {
  async get(key) {
    try {
      if (Platform.OS === 'web') return window.localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  async set(key, value) {
    try {
      if (Platform.OS === 'web') window.localStorage.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch { /* stockage indisponible : on continue sans persistance */ }
  },
  async remove(key) {
    try {
      if (Platform.OS === 'web') window.localStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch { /* idem */ }
  },
};
