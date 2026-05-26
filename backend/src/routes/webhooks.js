const express             = require('express');
const pool                = require('../db');
const { generateTicketPDF } = require('../services/ticketService');
const { uploadBuffer }    = require('../services/cloudinaryService');
const { sendTicketEmail } = require('../services/emailService');
const router              = express.Router();

// Genera número de ticket único para una rifa
async function generateTicketNumber(raffleId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM raffle_tickets WHERE raffle_id=$1`, [raffleId],
  );
  const seq = parseInt(rows[0].cnt) + 1;
  return String(seq).padStart(4, '0'); // Ej: 0001, 0042, 0500
}

// ── POST /api/webhooks/wompi ──────────────────────────────────
router.post('/wompi', async (req, res) => {
  // Siempre responder 200 a Wompi primero (aunque falle algo interno)
  res.status(200).json({ received: true });

  try {
    const payload = req.body;
    console.log('[Webhook] Recibido:', JSON.stringify(payload, null, 2));

    // 1. Solo procesar pagos exitosos
    if (payload.ResultadoTransaccion !== 'ExitosaAprobada') {
      console.log('[Webhook] Transacción no aprobada:', payload.ResultadoTransaccion);
      return;
    }

    const txId       = payload.IdTransaccion;
    const enlaceId   = payload.EnlacePago?.IdentificadorEnlaceComercio; // "RIFA-{id}"
    const buyerEmail = payload.cliente?.Email;
    const buyerName  = payload.cliente?.Nombre;
    const monto      = payload.Monto;
    const authCode   = payload.CodigoAutorizacion;

    // 2. Extraer raffleId
    if (!enlaceId || !enlaceId.startsWith('RIFA-')) {
      console.log('[Webhook] IdentificadorEnlaceComercio inválido:', enlaceId);
      return;
    }
    const raffleId = parseInt(enlaceId.replace('RIFA-', ''));
    if (isNaN(raffleId)) {
      console.log('[Webhook] raffleId no numérico:', enlaceId);
      return;
    }

    // 3. Idempotencia — verificar que no procesamos este tx antes
    const { rows: existing } = await pool.query(
      'SELECT id FROM raffle_tickets WHERE wompi_transaction_id=$1', [txId],
    );
    if (existing.length) {
      console.log('[Webhook] Transacción ya procesada:', txId);
      return;
    }

    // 4. Obtener la rifa
    const { rows: raffleRows } = await pool.query(
      'SELECT * FROM raffles WHERE id=$1', [raffleId],
    );
    if (!raffleRows.length) {
      console.log('[Webhook] Rifa no encontrada:', raffleId);
      return;
    }
    const raffle = raffleRows[0];

    // 5. Verificar que hay tickets disponibles
    if (raffle.sold_tickets >= raffle.total_tickets) {
      console.log('[Webhook] Rifa agotada:', raffleId);
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

    // 8. Actualizar contador de tickets vendidos
    await pool.query(
      'UPDATE raffles SET sold_tickets=sold_tickets+1 WHERE id=$1', [raffleId],
    );

    // 9. Generar PDF del ticket
    let pdfBuffer;
    try {
      pdfBuffer = await generateTicketPDF({
        ticketNumber,
        buyerName,
        buyerEmail,
        raffleTitle:       raffle.title,
        raffleDescription: raffle.description,
        raffleImage:       raffle.image_url,
        ticketPrice:       raffle.ticket_price,
        drawDate:          raffle.draw_date,
        transactionId:     txId,
        purchasedAt:       ticket.purchased_at,
      });
    } catch (pdfErr) {
      console.error('[Webhook] Error generando PDF:', pdfErr.message);
    }

    // 10. Subir PDF a Cloudinary
    let pdfUrl = null;
    if (pdfBuffer) {
      try {
        pdfUrl = await uploadBuffer(
          pdfBuffer,
          'rifas/tickets',
          `ticket-${raffleId}-${ticketNumber}`,
        );
        await pool.query(
          'UPDATE raffle_tickets SET ticket_pdf_url=$1 WHERE id=$2', [pdfUrl, ticket.id],
        );
      } catch (uploadErr) {
        console.error('[Webhook] Error subiendo PDF:', uploadErr.message);
      }
    }

    // 11. Enviar correo con ticket
    if (buyerEmail && pdfBuffer) {
      try {
        await sendTicketEmail({
          to:           buyerEmail,
          buyerName,
          raffleTitle:  raffle.title,
          ticketNumber,
          pdfBuffer,
        });
      } catch (emailErr) {
        console.error('[Webhook] Error enviando correo:', emailErr.message);
      }
    }

    console.log(`[Webhook] ✅ Ticket #${ticketNumber} confirmado para rifa ${raffleId} — comprador: ${buyerEmail}`);

  } catch (err) {
    console.error('[Webhook] Error general:', err);
  }
});

module.exports = router;
