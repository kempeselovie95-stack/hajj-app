import { useEffect, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { View } from 'react-native';
import AssistantFab from '../ui/AssistantFab.jsx';
import { ROLES } from '@hajj/shared';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import { storage } from '../storage.js';
import AuthStack from './AuthStack.jsx';
import PelerinTabs from './PelerinTabs.jsx';
import GuideTabs from './GuideTabs.jsx';
import WebOnlyScreen from '../screens/common/WebOnlyScreen.jsx';
import SplashScreen from '../screens/onboarding/SplashScreen.jsx';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen.jsx';

const ONBOARDED_KEY = 'hajj_onboarded';
const SPLASH_MIN_MS = 1600;

/** Chaque rôle arrive dans SON espace ; agence et admin plateforme sont orientés vers le web. */
function SpaceForRole({ role }) {
  if (role === ROLES.PELERIN) return <PelerinTabs />;
  if (role === ROLES.ENCADREUR) return <GuideTabs />;
  return <WebOnlyScreen />;
}

/**
 * Démarrage : splash animé (au moins 1,6 s, le temps de restaurer la session) →
 * carrousel de bienvenue au tout premier lancement → connexion, ou l'espace du rôle si déjà connecté.
 */
export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isRTL, ready } = useLanguage();
  const [onboarded, setOnboarded] = useState(null); // null = lecture en cours
  const [minTimeDone, setMinTimeDone] = useState(false);
  const navRef = useNavigationContainerRef();
  const [routeName, setRouteName] = useState('');
  usePushNotifications(); // no-op tant que isAuthenticated est false

  useEffect(() => {
    storage.get(ONBOARDED_KEY).then((value) => setOnboarded(value === '1'));
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  const finishOnboarding = () => { setOnboarded(true); storage.set(ONBOARDED_KEY, '1'); };

  if (isLoading || !ready || onboarded === null || !minTimeDone) return <SplashScreen />;
  if (!isAuthenticated && !onboarded) return <OnboardingScreen onDone={finishOnboarding} />;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navRef} direction={isRTL ? 'rtl' : 'ltr'} onReady={() => setRouteName(navRef.getCurrentRoute()?.name ?? '')} onStateChange={() => setRouteName(navRef.getCurrentRoute()?.name ?? '')}>
        {isAuthenticated ? <SpaceForRole role={user?.role} /> : <AuthStack />}
      </NavigationContainer>
      {/* Assistant IA (démo) : masqué sur les discussions pour ne pas gêner le bouton Envoyer. */}
      {isAuthenticated ? <AssistantFab hidden={['GroupChat', 'MyGroup'].includes(routeName)} /> : null}
    </View>
  );
}
