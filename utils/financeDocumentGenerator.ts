import type { AppSettings, FinanceDocument } from '../types';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatMoney = (value: number, currency: string) => new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
}).format(value);

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const generateFinanceDocument = (record: FinanceDocument, settings: AppSettings, options: { preview?: boolean } = {}) => {
  const win = window.open('', '_blank');
  if (!win) return false;

  const documentConfig = settings.documentConfig || {};
  const academyName = documentConfig.headerName || settings.academyName;
  const documentLabel = options.preview ? 'APERÇU DE FACTURE' : record.kind === 'credit_note' ? "FACTURE D'AVOIR" : 'FACTURE';
  const participants = record.participants.length
    ? `<div class="participants"><strong>Participant${record.participants.length > 1 ? 's' : ''}</strong><ul>${record.participants.map(participant => `<li>${escapeHtml(participant.name)}${participant.role ? ` — ${escapeHtml(participant.role)}` : ''}</li>`).join('')}</ul></div>`
    : '';
  const originalReference = record.originalInvoiceNumber
    ? `<p class="credit-reference">Avoir relatif à la facture <strong>${escapeHtml(record.originalInvoiceNumber)}</strong>${record.creditReason ? ` — ${escapeHtml(record.creditReason)}` : ''}</p>`
    : '';
  const beneficiaryReference = record.beneficiary?.name
    ? `<div class="beneficiary"><strong>Formation réalisée pour :</strong> ${escapeHtml(record.beneficiary.name)}${record.beneficiary.contactName ? ` · Contact : ${escapeHtml(record.beneficiary.contactName)}` : ''}${record.beneficiary.notes ? `<div class="meta">${escapeHtml(record.beneficiary.notes)}</div>` : ''}</div>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${documentLabel} ${escapeHtml(record.number)}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#e8eef4;color:#132238;font-family:Arial,Helvetica,sans-serif}.actions{width:210mm;margin:18px auto 8px;display:flex;justify-content:space-between;align-items:center}.actions button{border:0;border-radius:10px;background:#0c7c78;color:#fff;padding:11px 18px;font-weight:800;cursor:pointer}.sheet{width:210mm;min-height:297mm;margin:0 auto 24px;background:#fff;padding:18mm 17mm;box-shadow:0 18px 50px rgba(15,35,55,.14);position:relative}.top{display:grid;grid-template-columns:1.2fr .8fr;gap:30px;padding-bottom:18px;border-bottom:4px solid #0c7c78}.eyebrow{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#6f8093;font-weight:800}.title{font-size:32px;letter-spacing:-.04em;margin:7px 0 0}.number{font-family:Consolas,monospace;font-weight:800;color:#0c7c78;margin-top:7px}.issuer{text-align:right}.issuer h2{margin:0;font-size:19px}.meta{font-size:11px;color:#6f8093;line-height:1.55}.parties{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin:28px 0}.party{border-top:1px solid #d9e2ea;padding-top:10px}.party h3{margin:0 0 8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#0c7c78}.party p{margin:3px 0;font-size:12px}.party.customer{text-align:right}.credit-reference{background:#fff3cd;border-left:4px solid #e2a900;padding:11px 13px;font-size:12px}.subject{background:#eef8f7;border-left:4px solid #0c7c78;padding:12px 14px;margin:20px 0;font-size:13px}.beneficiary{border:1px solid #cfe3ef;background:#f4f9fc;border-radius:9px;padding:10px 12px;margin:-10px 0 18px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#132238;color:#fff;padding:10px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;text-align:right}th:first-child,td:first-child{text-align:left}td{padding:12px 8px;border-bottom:1px solid #e5ebf0;font-size:11px;text-align:right;vertical-align:top}.description{font-weight:800;overflow-wrap:anywhere}.line-details{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:5px}tr{break-inside:avoid}.totals{width:290px;margin:28px 0 0 auto;border:1px solid #cfdbe5;border-radius:10px;overflow:hidden}.total-row{display:flex;justify-content:space-between;padding:9px 13px;font-size:11px}.grand{background:#0c7c78;color:white;font-weight:900;font-size:15px;padding:13px}.participants{margin-top:28px;padding:13px 15px;background:#f6f8fa;border-radius:10px;font-size:11px}.participants ul{margin:8px 0 0;padding-left:18px;columns:2}.participants li{margin:4px 0}.footer{margin-top:25px;border-top:1px solid #d9e2ea;padding-top:10px;font-size:9px;line-height:1.5;color:#738397;text-align:center}@media print{body{background:#fff}.actions{display:none}.sheet{margin:0;box-shadow:none;width:100%;min-height:297mm}@page{size:A4;margin:0}}
  </style>
</head>
<body>
  <div class="actions"><div><strong>Aperçu ${documentLabel.toLowerCase()}</strong><div class="meta">${options.preview ? 'Document non émis. Aucun numéro définitif attribué.' : "Le document émis reste conservé dans l’historique Edufy."}</div></div><button onclick="window.print()">Imprimer / PDF</button></div>
  <main class="sheet">
    <header class="top">
      <div><div class="eyebrow">Document comptable</div><h1 class="title">${documentLabel}</h1><div class="number">N° ${escapeHtml(record.number)}</div><div class="meta">Émise le ${formatDate(record.issueDate)}${record.dueDate ? ` · Échéance ${formatDate(record.dueDate)}` : ''}</div></div>
      <div class="issuer"><h2>${escapeHtml(academyName)}</h2><div class="meta">${escapeHtml(documentConfig.address || '')}<br/>${documentConfig.taxId ? `ICE ${escapeHtml(documentConfig.taxId)}<br/>` : ''}${documentConfig.regId ? `RC ${escapeHtml(documentConfig.regId)}<br/>` : ''}${escapeHtml(documentConfig.email || '')}</div></div>
    </header>
    <section class="parties">
      <div class="party"><h3>Prestataire</h3><p><strong>${escapeHtml(academyName)}</strong></p><p>${escapeHtml(documentConfig.address || '')}</p>${documentConfig.phone ? `<p>${escapeHtml(documentConfig.phone)}</p>` : ''}</div>
      <div class="party customer"><h3>Facturé à</h3><p><strong>${escapeHtml(record.customer.name)}</strong></p>${record.customer.contactName ? `<p>Contact : ${escapeHtml(record.customer.contactName)}</p>` : ''}<p>${escapeHtml(record.customer.address || '')}</p>${record.customer.ice ? `<p>ICE : ${escapeHtml(record.customer.ice)}</p>` : ''}${record.customer.rc ? `<p>RC : ${escapeHtml(record.customer.rc)}</p>` : ''}</div>
    </section>
    ${originalReference}
    <div class="subject"><strong>Objet :</strong> ${escapeHtml(record.programName || record.lines[0]?.description || 'Prestation de formation')}</div>
    ${beneficiaryReference}
    <table><thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire HT</th><th>TVA</th><th>Total TTC</th></tr></thead><tbody>${record.lines.map(line => `<tr><td><div class="description">${escapeHtml(line.description)}</div>${line.details ? `<div class="meta line-details">${escapeHtml(line.details)}</div>` : ''}${line.unitLabel ? `<div class="meta">Unité : ${escapeHtml(line.unitLabel)}${line.hoursPerUnit ? ` · ${line.hoursPerUnit} h / unité` : ''}${line.sessionCount ? ` · ${line.sessionCount} séance(s)` : ''}</div>` : ''}</td><td>${line.quantity}</td><td>${formatMoney(line.unitPrice, record.currency)}</td><td>${line.taxRate}%</td><td><strong>${formatMoney(line.total, record.currency)}</strong></td></tr>`).join('')}</tbody></table>
    <div class="totals"><div class="total-row"><span>Total HT</span><strong>${formatMoney(record.subtotal, record.currency)}</strong></div><div class="total-row"><span>TVA</span><strong>${formatMoney(record.taxAmount, record.currency)}</strong></div><div class="total-row grand"><span>Total TTC</span><span>${formatMoney(record.total, record.currency)}</span></div></div>
    ${participants}
    <footer class="footer">${escapeHtml(academyName)}${documentConfig.website ? ` · ${escapeHtml(documentConfig.website)}` : ''}${documentConfig.taxId ? ` · ICE ${escapeHtml(documentConfig.taxId)}` : ''}${documentConfig.regId ? ` · RC ${escapeHtml(documentConfig.regId)}` : ''}</footer>
  </main>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  return true;
};
