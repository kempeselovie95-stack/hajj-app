import {
  useFonts as useFraunces,
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';

/**
 * Charge les polices du design system partagé (voir shared/constants/theme.js
 * -> TYPOGRAPHY.fontDisplay/fontBody/fontMono). Retourne `true` une fois
 * prêtes — à utiliser pour retarder le premier rendu (voir App.js) et
 * éviter le flash de police système.
 */
export function useAppFonts() {
  const [loaded] = useFraunces({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  return loaded;
}

/** Noms de police effectivement enregistrés par expo-font, à référencer dans les StyleSheets */
export const FONTS = Object.freeze({
  displayRegular: 'Fraunces_400Regular',
  displaySemibold: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  bodyRegular: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemibold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  monoRegular: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
});
