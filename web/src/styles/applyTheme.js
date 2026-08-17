import { THEME } from '@hajj/shared';

const CSS_VAR_MAP = {
  '--color-primary': THEME.colors.primary,
  '--color-primary-hover': THEME.colors.primaryHover,
  '--color-primary-tint': THEME.colors.primaryTint,
  '--color-accent': THEME.colors.accent,
  '--color-accent-tint': THEME.colors.accentTint,
  '--color-background': THEME.colors.background,
  '--color-surface': THEME.colors.surface,
  '--color-surface-muted': THEME.colors.surfaceMuted,
  '--color-border': THEME.colors.border,
  '--color-text-primary': THEME.colors.textPrimary,
  '--color-text-secondary': THEME.colors.textSecondary,
  '--color-success': THEME.colors.success,
  '--color-success-tint': THEME.colors.successTint,
  '--color-warning': THEME.colors.warning,
  '--color-warning-tint': THEME.colors.warningTint,
  '--color-danger': THEME.colors.danger,
  '--color-danger-tint': THEME.colors.dangerTint,
  '--color-info': THEME.colors.info,
  '--color-info-tint': THEME.colors.infoTint,
  '--color-neutral': THEME.colors.neutral,
  '--color-neutral-tint': THEME.colors.neutralTint,

  '--radius-sm': `${THEME.radius.sm}px`,
  '--radius-md': `${THEME.radius.md}px`,
  '--radius-lg': `${THEME.radius.lg}px`,

  '--shadow-card': THEME.shadow.card,
  '--shadow-elevated': THEME.shadow.elevated,
};

/** À appeler une seule fois, avant le premier rendu (voir main.jsx). */
export function applyWebTheme() {
  const root = document.documentElement;
  Object.entries(CSS_VAR_MAP).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
