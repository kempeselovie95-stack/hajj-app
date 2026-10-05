import QRCode from 'qrcode-terminal/vendor/QRCode';
import QRErrorCorrectLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel';

const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

/** QR Code en SVG (chaîne) pour l'intégrer dans le reçu imprimé — aucun appel réseau. */
export function qrSvg(value, size = 150) {
  const qr = new QRCode(-1, QRErrorCorrectLevel.M);
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 3;
  const total = count + quiet * 2;
  let cells = '';
  for (let row = 0; row < count; row += 1) for (let col = 0; col < count; col += 1) if (qr.isDark(row, col)) cells += `<rect x="${col + quiet}" y="${row + quiet}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#0f172a">${cells}</g></svg>`;
}

const RECEIPT_CSS = `
*{box-sizing:border-box}body{margin:0;background:#eef2f1;font:14px/1.5 "Segoe UI",Arial,sans-serif;color:#1f2937}
.sheet{position:relative;max-width:760px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,.12)}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:26px 32px;background:linear-gradient(135deg,#0b5d4c,#14845d);color:#fff}
.top h1{margin:0;font-size:22px;letter-spacing:.2px}.top p{margin:4px 0 0;opacity:.85;font-size:13px}
.num{text-align:end}.num strong{display:block;font-size:17px;letter-spacing:.5px}.num span{font-size:12px;opacity:.85}
.body{padding:28px 32px}
.stamp{position:absolute;top:96px;inset-inline-end:36px;transform:rotate(-12deg);border:3px solid #14845d;color:#14845d;border-radius:10px;padding:4px 16px;font-weight:800;letter-spacing:3px;font-size:20px;opacity:.85}
.grid{display:grid;grid-template-columns:1fr 190px;gap:28px;align-items:start}
dl{display:grid;grid-template-columns:150px 1fr;gap:10px 14px;margin:0}dt{color:#64748b}dd{margin:0;font-weight:600;word-break:break-word}
.qr{text-align:center;border:1px dashed #cbd5e1;border-radius:12px;padding:12px}.qr svg{display:block;margin:0 auto}
.qr strong{display:block;margin-top:8px;font-size:12px}.qr code{display:block;margin-top:2px;font-size:11px;color:#64748b;word-break:break-all}
.amounts{margin:26px 0 8px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}
.amounts div{display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #eef2f6}.amounts div:last-child{border:0}
.amounts .paid{background:#f0fdf4;color:#14845d;font-size:20px;font-weight:800}
.sign{display:flex;justify-content:space-between;gap:24px;margin-top:34px;color:#64748b;font-size:12px}.sign div{flex:1;border-top:1px solid #cbd5e1;padding-top:6px;text-align:center}
.foot{padding:14px 32px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center}
.actions{max-width:760px;margin:0 auto 24px;text-align:center}.actions button{padding:10px 22px;border:0;border-radius:10px;background:#0b5d4c;color:#fff;font-size:14px;cursor:pointer}
@media print{body{background:#fff}.sheet{margin:0;box-shadow:none;border-radius:0}.actions{display:none}@page{margin:10mm}}
@media (max-width:620px){.grid{grid-template-columns:1fr}.stamp{display:none}dl{grid-template-columns:120px 1fr}}`;

/** Reçu de paiement imprimable : coordonnées, montants, solde et QR Code du pèlerin. */
export function printReceipt(payment, { t, language, formatCurrency, formatDateTime }) {
  const number = `REC-${payment.annee_hajj}-${String(payment.id).padStart(6, '0')}`;
  const pilgrimCode = `HAJJ-CM-${payment.annee_hajj}-${String(payment.dossier_id).padStart(6, '0')}`;
  const total = Number(payment.forfait_prix || 0);
  const paidTotal = Number(payment.total_paye || 0);
  const balance = Math.max(0, total - paidTotal);
  const methodKey = `method_${payment.moyen_paiement}`;
  const method = t(methodKey) === methodKey ? payment.moyen_paiement || '—' : t(methodKey);
  const win = window.open('', '_blank', 'width=860,height=900');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${safe(t('pay_receiptTitle'))} ${safe(number)}</title><style>${RECEIPT_CSS}</style></head><body>
<div class="sheet">
  <div class="top"><div><h1>🕋 ${safe(t('pay_receiptOrg'))}</h1><p>${safe(payment.agence_nom || '')}</p></div><div class="num"><strong>${safe(t('pay_receiptTitle'))}</strong><span>${safe(number)}</span></div></div>
  <div class="stamp">${safe(t('pay_rPaidStamp'))}</div>
  <div class="body">
    <div class="grid">
      <dl>
        <dt>${safe(t('pay_rPilgrim'))}</dt><dd>${safe(payment.pelerin_nom)}</dd>
        <dt>${safe(t('pay_rPhone'))}</dt><dd>${safe(payment.pelerin_tel || '—')}</dd>
        <dt>${safe(t('pay_rAgency'))}</dt><dd>${safe(payment.agence_nom || '—')}</dd>
        <dt>${safe(t('pay_rDossier'))}</dt><dd>${safe(payment.numero_dossier)}</dd>
        <dt>${safe(t('pay_rPackage'))}</dt><dd>${safe(payment.forfait_nom || '—')}</dd>
        <dt>${safe(t('pay_rMethod'))}</dt><dd>${safe(method)}</dd>
        <dt>${safe(t('pay_rReference'))}</dt><dd>${safe(payment.reference || '—')}</dd>
        <dt>${safe(t('pay_rDate'))}</dt><dd>${safe(formatDateTime(payment.confirme_le || payment.cree_le))}</dd>
      </dl>
      <div class="qr">${payment.qr_token ? qrSvg(payment.qr_token) : ''}<strong>${safe(t('pay_rQr'))}</strong><code>${safe(pilgrimCode)}</code></div>
    </div>
    <div class="amounts">
      ${total ? `<div><span>${safe(t('pay_rTotal'))}</span><span>${safe(formatCurrency(total, payment.devise))}</span></div>` : ''}
      <div class="paid"><span>${safe(t('pay_rThisPayment'))}</span><span>${safe(formatCurrency(payment.montant, payment.devise))}</span></div>
      ${total ? `<div><span>${safe(t('pay_rPaidSoFar'))}</span><span>${safe(formatCurrency(paidTotal, payment.devise))}</span></div><div><span>${safe(t('pay_rBalance'))}</span><strong>${safe(formatCurrency(balance, payment.devise))}</strong></div>` : ''}
    </div>
    <div class="sign"><div>${safe(t('pay_rSignPilgrim'))}</div><div>${safe(t('pay_rSignAgency'))}</div></div>
  </div>
  <div class="foot">${safe(t('pay_rFooter'))}</div>
</div>
<div class="actions"><button onclick="window.print()">🖨️ ${safe(t('pay_rPrint'))}</button></div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  win.document.close();
}
