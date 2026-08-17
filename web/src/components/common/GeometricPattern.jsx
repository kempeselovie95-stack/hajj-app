/**
 * Trame géométrique à motif d'étoile à 8 branches (khatam), inspirée de
 * l'art islamique traditionnel. Élément signature du design system —
 * utilisé en filigrane discret (opacité faible), jamais comme illustration
 * figurative. Un seul <pattern> SVG, répété via tuilage.
 */
export default function GeometricPattern({ className = '', opacity = 0.06 }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="hajj-star-pattern"
          x="0"
          y="0"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          {/* Étoile à 8 branches (khatam) : polygone unique aux arêtes nettes,
              plus fidèle au tracé traditionnel que deux carrés superposés. */}
          <polygon
            points="32,6 39,20 54,14 46,28 60,32 46,36 54,50 39,44 32,58 25,44 10,50 18,36 4,32 18,28 10,14 25,20"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeLinejoin="miter"
            fill="none"
            opacity={opacity}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hajj-star-pattern)" />
    </svg>
  );
}
