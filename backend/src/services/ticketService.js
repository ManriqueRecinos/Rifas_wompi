const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

/**
 * Genera un PDF del ticket de rifa y lo guarda como buffer.
 */
async function generateTicketPDF(ticketData) {
  const {
    ticketNumber, buyerName, buyerEmail,
    raffleTitle, raffleDescription, raffleImage,
    ticketPrice, drawDate, transactionId, purchasedAt,
  } = ticketData;

  const drawStr    = drawDate ? new Date(drawDate).toLocaleDateString('es-SV', { dateStyle: 'full' }) : 'Por definir';
  const purchaseStr = new Date(purchasedAt).toLocaleString('es-SV');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    width:680px;height:340px;
    font-family:'DM Sans',sans-serif;
    background:#0a0a0a;color:#fff;
    display:flex;overflow:hidden;
  }
  .left{
    width:220px;min-width:220px;
    background:linear-gradient(160deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:24px 16px;gap:12px;position:relative;
  }
  .left::after{
    content:'';position:absolute;right:0;top:0;bottom:0;width:1px;
    background:repeating-linear-gradient(180deg,#e8c840 0px,#e8c840 8px,transparent 8px,transparent 16px);
  }
  .raffle-img{
    width:100px;height:100px;border-radius:12px;object-fit:cover;
    border:2px solid #e8c840;
  }
  .raffle-img-placeholder{
    width:100px;height:100px;border-radius:12px;
    background:linear-gradient(135deg,#1e3a5f,#0f3460);
    border:2px solid #e8c840;
    display:flex;align-items:center;justify-content:center;
    font-size:36px;
  }
  .ticket-label{
    font-family:'Bebas Neue',sans-serif;
    font-size:13px;letter-spacing:4px;color:#e8c840;
  }
  .ticket-num{
    font-family:'Bebas Neue',sans-serif;
    font-size:42px;letter-spacing:2px;color:#fff;
    line-height:1;
  }
  .right{
    flex:1;padding:24px 28px;display:flex;flex-direction:column;justify-content:space-between;
    background:#111;
  }
  .raffle-title{
    font-family:'Bebas Neue',sans-serif;
    font-size:26px;letter-spacing:1px;color:#e8c840;
    line-height:1.1;margin-bottom:4px;
  }
  .raffle-desc{font-size:11px;color:#888;line-height:1.4;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .info-item label{font-size:9px;letter-spacing:2px;color:#555;text-transform:uppercase;}
  .info-item p{font-size:13px;font-weight:700;color:#fff;margin-top:2px;}
  .footer{
    display:flex;align-items:center;justify-content:space-between;
    padding-top:12px;border-top:1px solid #222;
  }
  .tx-id{font-size:8px;color:#444;font-family:monospace;}
  .badge{
    background:#e8c840;color:#0a0a0a;
    font-size:9px;font-weight:700;letter-spacing:1px;
    padding:4px 10px;border-radius:4px;
  }
  .price-badge{
    background:linear-gradient(135deg,#e8c840,#d4a820);
    color:#0a0a0a;font-family:'Bebas Neue',sans-serif;
    font-size:22px;padding:6px 14px;border-radius:8px;
  }
</style>
</head>
<body>
  <div class="left">
    ${raffleImage
      ? `<img class="raffle-img" src="${raffleImage}" />`
      : `<div class="raffle-img-placeholder">🎟️</div>`}
    <span class="ticket-label">Ticket N°</span>
    <span class="ticket-num">${ticketNumber}</span>
    <span class="price-badge">$${parseFloat(ticketPrice).toFixed(2)}</span>
  </div>
  <div class="right">
    <div>
      <div class="raffle-title">${raffleTitle}</div>
      <div class="raffle-desc">${raffleDescription || ''}</div>
    </div>
    <div class="info-grid">
      <div class="info-item">
        <label>Comprador</label>
        <p>${buyerName || 'Anónimo'}</p>
      </div>
      <div class="info-item">
        <label>Correo</label>
        <p style="font-size:11px">${buyerEmail || '-'}</p>
      </div>
      <div class="info-item">
        <label>Fecha sorteo</label>
        <p>${drawStr}</p>
      </div>
      <div class="info-item">
        <label>Comprado el</label>
        <p style="font-size:11px">${purchaseStr}</p>
      </div>
    </div>
    <div class="footer">
      <div class="tx-id">TX: ${transactionId}</div>
      <div class="badge">✓ PAGO CONFIRMADO</div>
    </div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 680, height: 340 });

  const pdfBuffer = await page.pdf({
    width:  '680px',
    height: '340px',
    printBackground: true,
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = { generateTicketPDF };
