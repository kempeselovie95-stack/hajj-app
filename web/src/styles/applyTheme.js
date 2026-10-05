import { THEME, LIGHT_COLORS, DARK_COLORS } from '@hajj/shared';

const buildVars = (c) => ({
  '--color-primary': c.primary,
  '--color-primary-hover': c.primaryHover,
  '--color-primary-tint': c.primaryTint,
  '--color-accent': c.accent,
  '--color-accent-tint': c.accentTint,
  '--color-background': c.background,
  '--color-surface': c.surface,
  '--color-surface-muted': c.surfaceMuted,
  '--color-border': c.border,
  '--color-text-primary': c.textPrimary,
  '--color-text-secondary': c.textSecondary,
  '--color-success': c.success,
  '--color-success-tint': c.successTint,
  '--color-warning': c.warning,
  '--color-warning-tint': c.warningTint,
  '--color-danger': c.danger,
  '--color-danger-tint': c.dangerTint,
  '--color-info': c.info,
  '--color-info-tint': c.infoTint,
  '--color-neutral': c.neutral,
  '--color-neutral-tint': c.neutralTint,

  '--radius-sm': `${THEME.radius.sm}px`,
  '--radius-md': `${THEME.radius.md}px`,
  '--radius-lg': `${THEME.radius.lg}px`,

  '--shadow-card': THEME.shadow.card,
  '--shadow-elevated': THEME.shadow.elevated,
});

const STORAGE_KEY = 'hajj_theme';
export const readStoredTheme = () => { try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch { return 'system'; } };
export const storeTheme = (mode) => { try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* non bloquant */ } };
/** « system » suit le thème de l'appareil. */
export const resolveTheme = (preference) => (preference === 'dark' || (preference === 'system' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');

/** Applique la palette (variables CSS + attribut data-theme). Appelée au démarrage puis à chaque changement. */
export function applyWebTheme(preference = readStoredTheme()) {
  const mode = resolveTheme(preference);
  const root = document.documentElement;
  Object.entries(buildVars(mode === 'dark' ? DARK_COLORS : LIGHT_COLORS)).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  return mode;
}
