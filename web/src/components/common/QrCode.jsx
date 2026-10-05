import { useMemo } from 'react';
import QRCode from 'qrcode-terminal/vendor/QRCode';
import QRErrorCorrectLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel';

/**
 * QR Code rendu en SVG (aucun appel réseau, aucune donnée personnelle :
 * `value` est un jeton opaque que le backend résout à la lecture).
 */
export default function QrCode({ value, size = 192, label }) {
  const modules = useMemo(() => {
    if (!value) return null;
    const qr = new QRCode(-1, QRErrorCorrectLevel.M);
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    return { count, dark: Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, col) => qr.isDark(row, col))) };
  }, [value]);

  if (!modules) return null;
  const quiet = 4;
  const total = modules.count + quiet * 2;
  const cells = [];
  modules.dark.forEach((row, r) => row.forEach((isDark, c) => { if (isDark) cells.push(<rect key={`${r}-${c}`} x={c + quiet} y={r + quiet} width="1" height="1" />); }));
  return (
    <svg viewBox={`0 0 ${total} ${total}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges" className="rounded-lg bg-white">
      <rect width={total} height={total} fill="#fff" />
      <g fill="#0f172a">{cells}</g>
    </svg>
  );
}
