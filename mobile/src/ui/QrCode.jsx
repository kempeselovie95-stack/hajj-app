import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import QRCode from 'qrcode-terminal/vendor/QRCode';
import QRErrorCorrectLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel';

/** QR Code natif (SVG, 100 % hors-ligne). `value` est un jeton opaque : aucune donnée personnelle dans le code. */
export default function QrCode({ value, size = 200 }) {
  const cells = useMemo(() => {
    if (!value) return null;
    const qr = new QRCode(-1, QRErrorCorrectLevel.M);
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const dark = [];
    for (let row = 0; row < count; row += 1) for (let col = 0; col < count; col += 1) if (qr.isDark(row, col)) dark.push([row, col]);
    return { count, dark };
  }, [value]);
  if (!cells) return null;
  const quiet = 4;
  const total = cells.count + quiet * 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} accessibilityLabel="QR Code">
      <Rect width={total} height={total} fill="#ffffff" />
      {cells.dark.map(([row, col]) => <Rect key={`${row}-${col}`} x={col + quiet} y={row + quiet} width={1} height={1} fill="#0f172a" />)}
    </Svg>
  );
}
