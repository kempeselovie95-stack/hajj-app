import Svg, { Defs, Pattern, Polygon, Rect } from 'react-native-svg';
import { THEME } from '@hajj/shared';

/**
 * Équivalent RN de web/src/components/common/GeometricPattern.jsx —
 * même tracé d'étoile à 8 branches, adapté à react-native-svg (pas de
 * variables CSS disponibles côté RN, donc couleur passée directement).
 */
export default function GeometricPattern({ opacity = 0.06 }) {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      <Defs>
        <Pattern id="hajjStar" x="0" y="0" width={64} height={64} patternUnits="userSpaceOnUse">
          <Polygon
            points="32,6 39,20 54,14 46,28 60,32 46,36 54,50 39,44 32,58 25,44 10,50 18,36 4,32 18,28 10,14 25,20"
            stroke={THEME.colors.primary}
            strokeWidth={1}
            strokeLinejoin="miter"
            fill="none"
            opacity={opacity}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hajjStar)" />
    </Svg>
  );
}
