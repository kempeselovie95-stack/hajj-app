/**
 * Design tokens — source unique de vérité pour l'identité visuelle.
 *
 * Le web les consomme via `applyWebTheme()` (voir web/src/styles/applyTheme.js)
 * qui les injecte en variables CSS. Le mobile les consomme directement
 * dans les StyleSheets React Native. Ne jamais dupliquer une valeur de
 * couleur en dur ailleurs : toujours passer par ce fichier.
 *
 * Direction visuelle : sobriété d'un carnet de pèlerinage officiel —
 * vert émeraude profond (confiance, tradition), or en accent discret
 * (jamais dominant), fond ivoire chaud, typo manuscrite pour les titres.
 */

export const COLORS = Object.freeze({
  // Marque
  primary: '#0B5D4C',        // vert émeraude profond — actions principales, marque
  primaryHover: '#0E7561',
  primaryTint: '#E3F0EC',    // fond très clair pour badges/zones actives

  accent: '#C79A3D',         // or discret — highlights, éléments premium (jamais les CTA principaux)
  accentTint: '#F6EEDC',

  // Fond & surfaces
  background: '#FAF7F0',     // ivoire chaud
  surface: '#FFFFFF',
  surfaceMuted: '#F1EDE3',
  border: '#E4DFD1',

  // Texte
  textPrimary: '#16241F',    // charcoal teinté vert, pas de noir pur
  textSecondary: '#5B6B62',
  textOnPrimary: '#FAF7F0',

  // Sémantique (statuts) — voir constants/statuses.js pour le mapping
  success: '#1E8A5F',
  successTint: '#E4F5EC',
  warning: '#C79A3D',
  warningTint: '#F6EEDC',
  danger: '#B34B3C',
  dangerTint: '#FBEAE7',
  info: '#2E6F8E',
  infoTint: '#E7F1F5',
  neutral: '#8A9089',
  neutralTint: '#EEEDE8',
});

export const TYPOGRAPHY = Object.freeze({
  // Web : familles chargées via Google Fonts (voir web/index.html)
  // Mobile : nécessitent expo-font (voir mobile/src/hooks/useAppFonts.js)
  fontDisplay: 'Fraunces',        // titres — caractère manuscrit/officiel
  fontBody: 'Plus Jakarta Sans',  // UI, texte courant
  fontMono: 'IBM Plex Mono',      // numéros de dossier, dates, données

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
});

export const SPACING = Object.freeze({
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
});

export const RADIUS = Object.freeze({
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
});

export const SHADOW = Object.freeze({
  // Utilisé tel quel en CSS (web) ; converti en shadow* RN au besoin (mobile)
  card: '0 1px 3px rgba(22, 36, 31, 0.08), 0 1px 2px rgba(22, 36, 31, 0.06)',
  elevated: '0 4px 16px rgba(22, 36, 31, 0.12)',
});

export const THEME = Object.freeze({
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radius: RADIUS,
  shadow: SHADOW,
});

export default THEME;
