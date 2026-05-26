const express         = require('express');
const multer          = require('multer');
const fs              = require('fs/promises');
const pool            = require('../db');
const auth            = require('../middleware/auth');
const wompi           = require('../services/wompiService');
const { uploadImage } = require('../services/cloudinaryService');
const router          = express.Router();
const upload          = multer({ dest: '/tmp/' });

function collectImageFiles(req) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.filter((file) => file.fieldname === 'images' || file.fieldname === 'image');
}

async function uploadImagesSequentially(files) {
  const uploadedUrls = [];

  for (const file of files) {
    try {
      const url = await uploadImage(file.path, 'rifas');
      uploadedUrls.push(url);
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  }

  return uploadedUrls;
}

async function getNextTicketSequenceStart(client, raffleId) {
  const { rows } = await client.query(
    'SELECT COUNT(*) AS cnt FROM raffle_tickets WHERE raffle_id=$1',
    [raffleId],
  );
  return parseInt(rows[0].cnt, 10) + 1;
}

// ── Listar rifas públicas ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, u.name AS organizer_name,
             (r.total_tickets - r.sold_tickets) AS available_tickets
      FROM raffles r
      JOIN users u ON u.id = r.user_id
      WHERE r.status = 'active'
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener rifas' });
  }
});

// ── Mis rifas ─────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
              (r.total_tickets - r.sold_tickets) AS available_tickets,
              (SELECT COUNT(*) FROM raffle_tickets t WHERE t.raffle_id=r.id AND t.status='confirmed') AS confirmed_tickets
       FROM raffles r WHERE r.user_id=$1 ORDER BY r.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus rifas' });
  }
});

// ── Detalle de una rifa ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, u.name AS organizer_name,
             (r.total_tickets - r.sold_tickets) AS available_tickets
      FROM raffles r JOIN users u ON u.id=r.user_id
      WHERE r.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Rifa no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener rifa' });
  }
});

// ── Crear rifa + enlace Wompi ─────────────────────────────────
router.post('/', auth, upload.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, description, ticket_price, total_tickets, draw_date } = req.body;
    if (!title || !ticket_price || !total_tickets)
      return res.status(400).json({ error: 'title, ticket_price y total_tickets son requeridos' });

    const imageFiles = collectImageFiles(req);
    const imageUrls = imageFiles.length ? await uploadImagesSequentially(imageFiles) : [];
    const image_url = imageUrls[0] || null;

    // Insertar rifa en DB
    const { rows } = await client.query(
      `INSERT INTO raffles(user_id,title,description,image_url,image_urls,ticket_price,total_tickets,draw_date,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,'draft') RETURNING *`,
      [req.user.id, title, description, image_url, JSON.stringify(imageUrls), ticket_price, total_tickets, draw_date || null],
    );
    const raffle = rows[0];

    // Obtener credenciales Wompi del usuario (si tiene configuradas)
    const { rows: userRows } = await client.query(
      'SELECT wompi_app_id, wompi_secret, wompi_validated FROM users WHERE id=$1',
      [req.user.id],
    );
    const userData = userRows[0];
    const userCredentials = (userData?.wompi_app_id && userData?.wompi_secret)
      ? { appId: userData.wompi_app_id, secret: userData.wompi_secret }
      : null; // Usará las credenciales globales del .env

    // Crear enlace de pago en Wompi
    let wompiData = {};
    try {
      wompiData = await wompi.createPaymentLink(raffle, userCredentials);
      await client.query(
        `UPDATE raffles SET wompi_enlace_id=$1, wompi_url_enlace=$2, wompi_url_qr=$3, status='active'
         WHERE id=$4`,
        [wompiData.idEnlace, wompiData.urlEnlace, wompiData.urlQrCodeEnlace, raffle.id],
      );
      raffle.wompi_enlace_id  = wompiData.idEnlace;
      raffle.wompi_url_enlace = wompiData.urlEnlace;
      raffle.wompi_url_qr     = wompiData.urlQrCodeEnlace;
      raffle.status           = 'active';
    } catch (wompiErr) {
      console.error('[Wompi] Error creando enlace:', wompiErr.message);
      // Guardamos la rifa como draft si Wompi falla
      await client.query(`UPDATE raffles SET status='draft' WHERE id=$1`, [raffle.id]);
    }

    await client.query('COMMIT');
    res.status(201).json(raffle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear rifa' });
  } finally {
    client.release();
  }
});

// ── Tickets vendidos de una rifa ───────────────────────────────
router.get('/:id/tickets', auth, async (req, res) => {
  try {
    // Solo el dueño de la rifa puede ver los tickets
    const { rows: raffleRows } = await pool.query(
      'SELECT user_id FROM raffles WHERE id=$1', [req.params.id],
    );
    if (!raffleRows.length) return res.status(404).json({ error: 'Rifa no encontrada' });
    if (raffleRows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'Sin acceso' });

    const { rows } = await pool.query(
      `SELECT * FROM raffle_tickets WHERE raffle_id=$1 ORDER BY purchased_at DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

// ── Obtener tickets comprados por el usuario autenticado ───────
router.get('/purchases/mine', auth, async (req, res) => {
  try {
    // Buscamos tickets en los que el correo coincida con el email del usuario autenticado
    const { rows } = await pool.query(
      `SELECT t.*, r.title AS raffle_title, r.draw_date, r.image_url AS raffle_image, u.name AS organizer_name
       FROM raffle_tickets t
       JOIN raffles r ON t.raffle_id = r.id
       JOIN users u ON r.user_id = u.id
       WHERE t.buyer_email = $1
       ORDER BY t.purchased_at DESC`,
      [req.user.email]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus tickets comprados' });
  }
});

// ── Descargar PDF del ticket ──────────────────────────────────
router.get('/tickets/:ticketId/pdf', auth, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const { rows } = await pool.query(
      `SELECT t.*, r.title AS raffle_title, r.description AS raffle_description,
              r.image_url AS raffle_image, r.image_urls AS raffle_image_urls,
              r.ticket_price, r.draw_date
         FROM raffle_tickets t
         JOIN raffles r ON t.raffle_id = r.id
        WHERE t.id = $1`,
      [ticketId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = rows[0];
    const { rows: raffleOwner } = await pool.query(
      'SELECT user_id FROM raffles WHERE id = $1', [ticket.raffle_id],
    );

    const isBuyer = ticket.buyer_email === req.user.email;
    const isOwner = raffleOwner.length && raffleOwner[0].user_id === req.user.id;

    if (!isBuyer && !isOwner) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este ticket' });
    }

    const { generateTicketPDF } = require('../services/ticketService');
    const primaryImage = Array.isArray(ticket.raffle_image_urls) && ticket.raffle_image_urls.length
      ? ticket.raffle_image_urls[0]
      : ticket.raffle_image;

    const pdfBuffer = await generateTicketPDF({
      ticketNumber:      ticket.ticket_number,
      buyerName:         ticket.buyer_name || 'Comprador',
      buyerEmail:        ticket.buyer_email || '',
      raffleTitle:       ticket.raffle_title,
      raffleDescription: ticket.raffle_description,
      raffleImage:       primaryImage,
      ticketPrice:       ticket.ticket_price,
      drawDate:          ticket.draw_date,
      transactionId:     ticket.wompi_transaction_id || 'EFECTIVO',
      purchasedAt:       ticket.purchased_at,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticket_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[Ticket-PDF] Error al descargar PDF:', err);
    res.status(500).json({ error: 'Error al generar el PDF del ticket' });
  }
});

// ── Reenviar ticket por correo electrónico ──────────────────────
router.post('/tickets/:ticketId/resend', auth, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Obtener datos del ticket y la rifa asociada
    const { rows } = await pool.query(
      `SELECT t.*, r.title AS raffle_title, r.description AS raffle_description, r.image_url AS raffle_image, r.ticket_price, r.draw_date
       FROM raffle_tickets t
       JOIN raffles r ON t.raffle_id = r.id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = rows[0];

    // Verificar si el usuario tiene permiso (debe ser el comprador o el dueño de la rifa)
    const { rows: raffleOwner } = await pool.query(
      'SELECT user_id FROM raffles WHERE id = $1', [ticket.raffle_id]
    );
    
    const isBuyer = ticket.buyer_email === req.user.email;
    const isOwner = raffleOwner.length && raffleOwner[0].user_id === req.user.id;

    if (!isBuyer && !isOwner) {
      return res.status(403).json({ error: 'No tienes permiso para reenviar este ticket' });
    }

    // Volver a generar el buffer PDF con Puppeteer
    const { generateTicketPDF } = require('../services/ticketService');
    const { sendTicketEmail } = require('../services/emailService');

    const pdfBuffer = await generateTicketPDF({
      ticketNumber:      ticket.ticket_number,
      buyerName:         ticket.buyer_name || 'Comprador',
      buyerEmail:        ticket.buyer_email || '',
      raffleTitle:       ticket.raffle_title,
      raffleDescription: ticket.raffle_description,
      raffleImage:       ticket.raffle_image,
      ticketPrice:       ticket.ticket_price,
      drawDate:          ticket.draw_date,
      transactionId:     ticket.wompi_transaction_id || 'EFECTIVO',
      purchasedAt:       ticket.purchased_at,
    });

    // Enviar correo
    await sendTicketEmail({
      to:           ticket.buyer_email,
      buyerName:    ticket.buyer_name || 'Comprador',
      buyerEmail:   ticket.buyer_email || '',
      raffleTitle:  ticket.raffle_title,
      ticketNumber: ticket.ticket_number,
      pdfBuffer,
    });

    res.json({ success: true, message: '✉️ Ticket reenviado correctamente al correo del comprador' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reenviar el ticket por correo' });
  }
});

// ── Compra manual / Pago contra entrega (Efectivo) ─────────────
router.post('/:id/cash-purchase', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quantity = Math.max(1, parseInt(req.body.quantity || '1', 10));
    const { buyer_name, buyer_email } = req.body;
    if (!buyer_name || !buyer_email) {
      return res.status(400).json({ error: 'buyer_name y buyer_email son requeridos' });
    }

    // 1. Obtener y verificar que la rifa pertenezca al usuario autenticado
    const { rows: raffleRows } = await client.query(
      'SELECT * FROM raffles WHERE id=$1', [req.params.id],
    );
    if (!raffleRows.length) {
      return res.status(404).json({ error: 'Rifa no encontrada' });
    }
    const raffle = raffleRows[0];
    if (raffle.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para registrar pagos en esta rifa' });
    }

    // 2. Verificar disponibilidad de tickets
    if (raffle.sold_tickets + quantity > raffle.total_tickets) {
      return res.status(400).json({ error: 'La rifa ya está agotada' });
    }

    const startSequence = await getNextTicketSequenceStart(client, raffle.id);
    const { generateTicketPDF } = require('../services/ticketService');
    const { uploadBuffer } = require('../services/cloudinaryService');
    const { sendTicketEmail } = require('../services/emailService');

    const createdTickets = [];
    for (let index = 0; index < quantity; index += 1) {
      const ticketNumber = String(startSequence + index).padStart(4, '0');
      const txId = `CASH-${raffle.id}-${ticketNumber}-${Date.now().toString().slice(-4)}${quantity > 1 ? `-${index + 1}` : ''}`;

      const { rows: ticketRows } = await client.query(
        `INSERT INTO raffle_tickets
           (raffle_id, ticket_number, buyer_name, buyer_email,
            wompi_transaction_id, wompi_authorization_code, amount_paid, status)
         VALUES($1,$2,$3,$4,$5,'CASH_OK',$6,'confirmed') RETURNING *`,
        [raffle.id, ticketNumber, buyer_name, buyer_email, txId, raffle.ticket_price],
      );

      const ticket = ticketRows[0];

      const pdfBuffer = await generateTicketPDF({
        ticketNumber,
        buyerName: buyer_name,
        buyerEmail: buyer_email,
        raffleTitle: raffle.title,
        raffleDescription: raffle.description,
        raffleImage: raffle.image_url,
        ticketPrice: raffle.ticket_price,
        drawDate: raffle.draw_date,
        transactionId: txId,
        purchasedAt: ticket.purchased_at,
      });

      try {
        await sendTicketEmail({
          to: buyer_email,
          buyerName: buyer_name,
          buyerEmail: buyer_email,
          raffleTitle: raffle.title,
          ticketNumber,
          pdfBuffer,
        });
      } catch (emailErr) {
        console.error('[Cash-Purchase] Error sending email:', emailErr.message);
      }

      try {
        const pdfUrl = await uploadBuffer(
          pdfBuffer,
          'rifas/tickets',
          `ticket-${raffle.id}-${ticketNumber}.pdf`,
        );
        await client.query(
          'UPDATE raffle_tickets SET ticket_pdf_url=$1 WHERE id=$2', [pdfUrl, ticket.id],
        );
      } catch (uploadErr) {
        console.error('[Cash-Purchase] Error uploading PDF:', uploadErr.message);
      }

      createdTickets.push(ticket);
    }

    await client.query(
      'UPDATE raffles SET sold_tickets=sold_tickets+$1 WHERE id=$2', [quantity, raffle.id],
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, tickets: createdTickets });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al procesar el pago en efectivo' });
  } finally {
    client.release();
  }
});

// ── Confirmar compra Wompi desde el redirect del navegador ─────
router.post('/:id/confirm-wompi-purchase', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const raffleId = parseInt(req.params.id, 10);
    const quantity = Math.max(1, parseInt(req.body.quantity || '1', 10));
    const { txId, buyer_name, buyer_email, amount_paid } = req.body;

    if (!raffleId || !txId || !buyer_name || !buyer_email) {
      return res.status(400).json({ error: 'raffleId, txId, buyer_name y buyer_email son requeridos' });
    }

    const { rows: raffleRows } = await client.query(
      'SELECT * FROM raffles WHERE id=$1', [raffleId],
    );
    if (!raffleRows.length) {
      return res.status(404).json({ error: 'Rifa no encontrada' });
    }
    const raffle = raffleRows[0];

    const { rows: existingRows } = await client.query(
      'SELECT * FROM raffle_tickets WHERE wompi_transaction_id=$1 OR wompi_transaction_id LIKE $2',
      [txId, `${txId}-%`],
    );

    if (existingRows.length) {
      await client.query('COMMIT');
      return res.json({ success: true, ticket: existingRows[0], tickets: existingRows });
    }

    if (raffle.sold_tickets + quantity > raffle.total_tickets) {
      return res.status(400).json({ error: 'La rifa ya está agotada' });
    }

    const startSequence = await getNextTicketSequenceStart(client, raffleId);

    const { generateTicketPDF } = require('../services/ticketService');
    const { uploadBuffer } = require('../services/cloudinaryService');
    const { sendTicketEmail } = require('../services/emailService');
    const createdTickets = [];

    for (let index = 0; index < quantity; index += 1) {
      const ticketNumber = String(startSequence + index).padStart(4, '0');
      const txSuffix = quantity > 1 ? `-${index + 1}` : '';
      const uniqueTxId = `${txId}${txSuffix}`;

      const { rows: insertedRows } = await client.query(
        `INSERT INTO raffle_tickets
           (raffle_id, ticket_number, buyer_name, buyer_email,
            wompi_transaction_id, wompi_authorization_code, amount_paid, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,'confirmed') RETURNING *`,
        [raffleId, ticketNumber, buyer_name, buyer_email, uniqueTxId, null, raffle.ticket_price],
      );
      const ticket = insertedRows[0];

      const pdfBuffer = await generateTicketPDF({
        ticketNumber,
        buyerName: buyer_name,
        buyerEmail: buyer_email,
        raffleTitle: raffle.title,
        raffleDescription: raffle.description,
        raffleImage: raffle.image_url,
        ticketPrice: raffle.ticket_price,
        drawDate: raffle.draw_date,
        transactionId: uniqueTxId,
        purchasedAt: ticket.purchased_at,
      });

      await sendTicketEmail({
        to: buyer_email,
        buyerName: buyer_name,
        buyerEmail: buyer_email,
        raffleTitle: raffle.title,
        ticketNumber,
        pdfBuffer,
      });

      if (!ticket.ticket_pdf_url) {
        try {
          const pdfUrl = await uploadBuffer(
            pdfBuffer,
            'rifas/tickets',
            `ticket-${raffleId}-${ticketNumber}.pdf`,
          );
          await client.query(
            'UPDATE raffle_tickets SET ticket_pdf_url=$1 WHERE id=$2', [pdfUrl, ticket.id],
          );
          ticket.ticket_pdf_url = pdfUrl;
        } catch (uploadErr) {
          console.error('[Wompi-Confirm] PDF no se pudo subir a Cloudinary:', uploadErr.message);
        }
      }

      createdTickets.push(ticket);
    }

    await client.query(
      'UPDATE raffles SET sold_tickets=sold_tickets+$1 WHERE id=$2', [quantity, raffleId],
    );

    await client.query('COMMIT');
    res.json({ success: true, tickets: createdTickets });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Wompi-Confirm] Error:', err);
    res.status(500).json({ error: 'Error al confirmar el pago' });
  } finally {
    client.release();
  }
});

// ── Desactivar rifa ────────────────────────────────────────────
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE raffles SET status='cancelled' WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Rifa no encontrada o sin permisos' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar rifa' });
  }
});

module.exports = router;
