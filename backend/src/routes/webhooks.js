const express             = require('express');
const pool                = require('../db');
const { generateTicketPDF } = require('../services/ticketService');
const { uploadBuffer }    = require('../services/cloudinaryService');
const { sendTicketEmail } = require('../services/emailService');
const router              = express.Router();

function normalizeBuyerName(name, email) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (cleanName) return cleanName;

  const localPart = typeof email === 'string' && email.includes('@')
    ? email.split('@')[0].trim()
    : '';

  if (!localPart) return 'Comprador';

  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractBuyerData(payload) {
  const clienteData = payload.cliente || payload.Cliente || payload.customer || payload.Customer || {};
  const buyerEmail = getFirstString(
    clienteData.EMail,
    clienteData.Email,
    clienteData.email,
    clienteData.Correo,
    clienteData.correo,
    payload.EMail,
    payload.Email,
    payload.email,
    payload.Correo,
    payload.correo,
  );

  const buyerName = getFirstString(
    clienteData.NombreCompleto,
    clienteData.nombreCompleto,
    clienteData.Nombre,
    clienteData.nombre,
    clienteData.Nombres,
    clienteData.nombres,
    payload.NombreCompleto,
    payload.nombreCompleto,
    payload.Nombre,
    payload.nombre,
  );

  return {
    buyerEmail,
    buyerName: normalizeBuyerName(buyerName, buyerEmail),
  };
}

// Genera número de ticket único para una rifa
async function generateTicketNumber(raffleId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM raffle_tickets WHERE raffle_id=$1`, [raffleId],
  );
  const seq = parseInt(rows[0].cnt) + 1;
  return String(seq).padStart(4, '0');
}

// ── POST /api/webhooks/wompi ──────────────────────────────────
router.post('/wompi', async (req, res) => {
  // Siempre responder 200 a Wompi primero (aunque falle algo interno)
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    console.log('═══════════════════════════════════════════');
    console.log('[Webhook] Recibido:', JSON.stringify(payload, null, 2));
    console.log('═══════════════════════════════════════════');

    // 1. Solo procesar pagos exitosos
    if (payload.ResultadoTransaccion !== 'ExitosaAprobada') {
      console.log('[Webhook] ❌ Transacción no aprobada:', payload.ResultadoTransaccion);
      return;
    }

    const txId     = payload.IdTransaccion;
    const monto    = payload.Monto;
    const authCode = payload.CodigoAutorizacion;

    // Wompi puede enviar datos del cliente en distintas formas según modo sandbox/producción
    const { buyerEmail, buyerName } = extractBuyerData(payload);

    const enlacePago  = payload.EnlacePago || payload.enlacePago || {};
    const enlaceId    = enlacePago.IdentificadorEnlaceComercio || enlacePago.identificadorEnlaceComercio;

    console.log('[Webhook] Datos extraídos:');
    console.log('  - txId:', txId);
    console.log('  - buyerName:', buyerName);
    console.log('  - buyerEmail:', buyerEmail);
    console.log('  - enlaceId:', enlaceId);
    console.log('  - monto:', monto);

    // 2. Extraer raffleId
    if (!enlaceId || !enlaceId.startsWith('RIFA-')) {
      console.log('[Webhook] ❌ IdentificadorEnlaceComercio inválido:', enlaceId);
      return;
    }
    const raffleId = parseInt(enlaceId.replace('RIFA-', ''));
    if (isNaN(raffleId)) {
      console.log('[Webhook] ❌ raffleId no numérico:', enlaceId);
      return;
    }

    // 3. Idempotencia — verificar que no procesamos este tx antes
    const { rows: existing } = await pool.query(
      'SELECT id FROM raffle_tickets WHERE wompi_transaction_id=$1', [txId],
    );
    if (existing.length) {
      console.log('[Webhook] ⚠️ Transacción ya procesada:', txId);
      return;
    }

    // 4. Obtener la rifa
    const { rows: raffleRows } = await pool.query(
      'SELECT * FROM raffles WHERE id=$1', [raffleId],
    );
    if (!raffleRows.length) {
      console.log('[Webhook] ❌ Rifa no encontrada:', raffleId);
      return;
    }
    const raffle = raffleRows[0];

    // 5. Verificar que hay tickets disponibles
    if (raffle.sold_tickets >= raffle.total_tickets) {
      console.log('[Webhook] ❌ Rifa agotada:', raffleId);
      return;
    }

    // 6. Generar número de ticket
    const ticketNumber = await generateTicketNumber(raffleId);

    // 7. Insertar ticket en DB
    const { rows: ticketRows } = await pool.query(
      `INSERT INTO raffle_tickets
         (raffle_id, ticket_number, buyer_name, buyer_email,
          wompi_transaction_id, wompi_authorization_code, amount_paid, status)
       VALUES($1,$2,$3,$4,$5,$6,$7,'confirmed') RETURNING *`,
      [raffleId, ticketNumber, buyerName, buyerEmail, txId, authCode, monto],
    );
    const ticket = ticketRows[0];
    const ticketBuyerName = normalizeBuyerName(ticket.buyer_name || buyerName, buyerEmail);
    console.log('[Webhook] ✅ Ticket insertado en DB:', ticket.id, '- Número:', ticketNumber);

    // 8. Actualizar contador de tickets vendidos
    await pool.query(
      'UPDATE raffles SET sold_tickets=sold_tickets+1 WHERE id=$1', [raffleId],
    );
    console.log('[Webhook] ✅ Contador sold_tickets actualizado');

    const { rows: raffleAfterRows } = await pool.query(
      'SELECT sold_tickets, total_tickets FROM raffles WHERE id=$1', [raffleId],
    );
    if (raffleAfterRows[0]?.sold_tickets >= raffleAfterRows[0]?.total_tickets) {
      const { rows: ticketsRows } = await pool.query(
        'SELECT id FROM raffle_tickets WHERE raffle_id=$1 ORDER BY id ASC', [raffleId],
      );
      if (ticketsRows.length) {
        const winnerId = ticketsRows[require('crypto').randomInt(ticketsRows.length)].id;
        await pool.query(
          `UPDATE raffles
              SET winning_ticket_id=$1, status='completed', updated_at=NOW()
            WHERE id=$2`,
          [winnerId, raffleId],
        );
      }
    }

    // 9. Generar PDF del ticket
    let pdfBuffer;
    try {
      pdfBuffer = await generateTicketPDF({
        ticketNumber,
        buyerName: ticketBuyerName,
        buyerEmail: buyerEmail || '',
        raffleTitle:       raffle.title,
        raffleDescription: raffle.description,
        raffleImage:       raffle.image_url,
        ticketPrice:       raffle.ticket_price,
        drawDate:          raffle.draw_date,
        transactionId:     txId,
        purchasedAt:       ticket.purchased_at,
        validationCode:    ticket.validation_code,
      });
      console.log('[Webhook] ✅ PDF generado correctamente');
    } catch (pdfErr) {
      console.error('[Webhook] ❌ Error generando PDF:', pdfErr.message);
    }

    // 10. Subir PDF a Cloudinary
    let pdfUrl = null;
    if (pdfBuffer) {
      try {
        // Para subir como .pdf real a Cloudinary pasamos el public_id con la extensión .pdf
        pdfUrl = await uploadBuffer(
          pdfBuffer,
          'rifas/tickets',
          `ticket-${raffleId}-${ticketNumber}.pdf`,
        );
        await pool.query(
          'UPDATE raffle_tickets SET ticket_pdf_url=$1 WHERE id=$2', [pdfUrl, ticket.id],
        );
        console.log('[Webhook] ✅ PDF subido a Cloudinary:', pdfUrl);
      } catch (uploadErr) {
        console.error('[Webhook] ❌ Error subiendo PDF:', uploadErr.message);
      }
    }

    // 11. El correo final se confirma desde el redirect del navegador,
    // porque ahí recuperamos el nombre y correo que el comprador escribió.
    if (!buyerEmail) {
      console.log('[Webhook] ⚠️ Quedó pendiente el correo: Wompi no proporcionó email del comprador (modo sandbox)');
    }

    console.log(`[Webhook] 🎉 COMPLETADO — Ticket #${ticketNumber} para rifa ${raffleId} (${raffle.title})`);

  } catch (err) {
    console.error('[Webhook] ❌ Error general:', err);
  }
});

module.exports = router;

