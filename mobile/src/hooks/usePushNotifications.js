import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext.jsx';

// Affiche l'alerte/son même quand l'app est au premier plan — sans ce
// handler, les notifications reçues app ouverte n'apparaissent nulle part.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Enregistre l'appareil pour les notifications push dès que l'utilisateur
 * est authentifié. Expo unifie Firebase Cloud Messaging (Android) et APNs
 * (iOS) derrière un seul token — c'est ce token qu'on transmet au backend,
 * qui reste responsable de l'appel réel à FCM/APNs pour l'envoi.
 *
 * TODO(intégration) : `extra.eas.projectId` doit être renseigné dans
 * app.json après `eas init` (nécessaire pour obtenir un vrai token en
 * dehors d'Expo Go). Sans backend actif, `registerPushToken` échouera
 * silencieusement — c'est voulu (voir catch ci-dessous).
 */
export function usePushNotifications() {
  const { isAuthenticated, api } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    let isCancelled = false;

    (async () => {
      if (!Device.isDevice) {
        // Les simulateurs/émulateurs ne reçoivent pas de tokens push valides.
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted' || isCancelled) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (!isCancelled) {
          await api.notifications.registerPushToken(token);
        }
      } catch (err) {
        // Pas de backend actif en dev / pas de projectId EAS configuré :
        // on ne bloque jamais l'utilisateur pour ça, juste un avertissement.
        console.warn("Échec de l'enregistrement du token push :", err.message);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, api]);
}
