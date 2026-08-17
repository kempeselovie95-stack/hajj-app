/**
 * Les couleurs ne sont JAMAIS des valeurs hex en dur ici : elles pointent
 * vers les variables CSS injectées au runtime par `applyTheme.js` à partir
 * de `@hajj/shared` (constants/theme.js), qui reste la source unique de
 * vérité partagée avec le mobile.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          tint: 'var(--color-primary-tint)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          tint: 'var(--color-accent-tint)',
        },
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        background: 'var(--color-background)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        success: { DEFAULT: 'var(--color-success)', tint: 'var(--color-success-tint)' },
        warning: { DEFAULT: 'var(--color-warning)', tint: 'var(--color-warning-tint)' },
        danger: { DEFAULT: 'var(--color-danger)', tint: 'var(--color-danger-tint)' },
        info: { DEFAULT: 'var(--color-info)', tint: 'var(--color-info-tint)' },
        neutral: { DEFAULT: 'var(--color-neutral)', tint: 'var(--color-neutral-tint)' },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
      },
    },
  },
  plugins: [],
};
