import { THEME } from '@hajj/shared';

/**
 * Équivalent mobile des classes Tailwind sémantiques côté web
 * (voir web/src/components/common/StatusBadge.jsx). Un seul endroit
 * à modifier si la palette de statuts évolue.
 */
export const SEMANTIC_COLORS = {
  success: { text: THEME.colors.success, bg: THEME.colors.successTint },
  warning: { text: THEME.colors.warning, bg: THEME.colors.warningTint },
  danger: { text: THEME.colors.danger, bg: THEME.colors.dangerTint },
  info: { text: THEME.colors.info, bg: THEME.colors.infoTint },
  neutral: { text: THEME.colors.neutral, bg: THEME.colors.neutralTint },
};

export function getSemanticColor(key) {
  return SEMANTIC_COLORS[key] ?? SEMANTIC_COLORS.neutral;
}
