const express         = require('express');
const multer          = require('multer');
const fs              = require('fs/promises');
const crypto          = require('crypto');
const pool            = require('../db');
const auth            = require('../middleware/auth');
const wompi           = require('../services/wompiService');
const { uploadImage } = require('../services/cloudinaryService');
const router          = express.Router();
const upload          = multer({ dest: '/tmp/' });

const VALIDATION_SECRET = process.env.VALIDATION_SECRET || process.env.JWT_SECRET || 'rifas-validation-secret';

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

async function selectAutomaticWinner(client, raffleId) {
  const { rows: raffleRows } = await client.query(
    'SELECT id, winning_ticket_id, winning_ticket_ids FROM raffles WHERE id=$1', [raffleId],
  );
  if (!raffleRows.length) {
    return null;
  }

  const existingWinnerIds = Array.isArray(raffleRows[0].winning_ticket_ids)
    ? raffleRows[0].winning_ticket_ids
    : raffleRows[0].winning_ticket_id
      ? [raffleRows[0].winning_ticket_id]
      : [];

  if (existingWinnerIds.length) {
    return existingWinnerIds[0];
  }

  const { rows: ticketRows } = await client.query(
    'SELECT id FROM raffle_tickets WHERE raffle_id=$1 ORDER BY id ASC', [raffleId],
  );
  if (!ticketRows.length) return null;

  const winner = ticketRows[crypto.randomInt(ticketRows.length)].id;
  const winnerIds = [winner];
  await client.query(
    `UPDATE raffles
        SET winning_ticket_id=$1, winning_ticket_ids=$2, status='completed', updated_at=NOW()
      WHERE id=$3`,
    [winner, JSON.stringify(winnerIds), raffleId],
  );
  return winner;
}

async function finalizeManualDraw(client, raffleId, winnerTicketIds = [], eliminatedTicketIds = []) {
  const { rows: raffleRows } = await client.query(
    'SELECT id, user_id, winning_ticket_id, winning_ticket_ids FROM raffles WHERE id=$1', [raffleId],
  );

  if (!raffleRows.length) {
    throw new Error('Rifa no encontrada');
  }

  const raffle = raffleRows[0];
  const winnerIds = [...new Set((Array.isArray(winnerTicketIds) ? winnerTicketIds : [winnerTicketIds]).map((value) => parseInt(value, 10)).filter(Boolean))];
  const uniqueEliminatedIds = [...new Set((eliminatedTicketIds || []).map((value) => parseInt(value, 10)).filter(Boolean))];

  if (winnerIds.length) {
    const { rows: winnerRows } = await client.query(
      'SELECT id FROM raffle_tickets WHERE raffle_id=$1 AND id = ANY($2::int[])',
      [raffleId, winnerIds],
    );
    if (winnerRows.length !== winnerIds.length) {
      throw new Error('Uno o más tickets ganadores no fueron encontrados');
    }
  }

  if (uniqueEliminatedIds.length) {
    await client.query(
      `UPDATE raffle_tickets
          SET status='eliminated'
        WHERE raffle_id=$1 AND id = ANY($2::int[]) AND NOT (id = ANY($3::int[]))`,
      [raffleId, uniqueEliminatedIds, winnerIds.length ? winnerIds : [0]],
    );
  }

  if (winnerIds.length) {
    await client.query(
      `UPDATE raffle_tickets
          SET status='winner'
        WHERE raffle_id=$1 AND id = ANY($2::int[])`,
      [raffleId, winnerIds],
    );

    await client.query(
      `UPDATE raffles
          SET winning_ticket_id=$1,
              winning_ticket_ids=$2,
              status='completed',
              updated_at=NOW()
        WHERE id=$2`,
      [winnerIds[0], JSON.stringify(winnerIds), raffleId],
    );
    return { winnerTicketIds: winnerIds, eliminatedTicketIds: uniqueEliminatedIds };
  }

  if (raffle.winning_ticket_id) {
    return { winnerTicketIds: raffle.winning_ticket_ids || [raffle.winning_ticket_id], eliminatedTicketIds: uniqueEliminatedIds };
  }

  return { winnerTicketIds: [], eliminatedTicketIds: uniqueEliminatedIds };
}

function createValidationCode(raffleId, ticketNumber) {
  const nonce = crypto.randomBytes(10).toString('hex');
  const payload = `${raffleId}.${ticketNumber}.${nonce}`;
  const signature = crypto
    .createHmac('sha256', VALIDATION_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 24);
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

function verifyValidationCode(code) {
  try {
    const raw = Buffer.from(code, 'base64url').toString('utf8');
    const parts = raw.split('.');
    if (parts.length !== 4) return false;
    const payload = parts.slice(0, 3).join('.');
    const signature = parts[3];
    const expected = crypto
      .createHmac('sha256', VALIDATION_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 24);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function getPrimaryRaffleImage(raffle) {
  return Array.isArray(raffle.image_urls) && raffle.image_urls.length > 0
    ? raffle.image_urls[0]
    : raffle.image_url || null;
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

// ── Validar ticket público por código QR ──────────────────────
router.get('/validate-ticket/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!verifyValidationCode(code)) {
      return res.status(400).json({ error: 'Código de validación inválido' });
    }

    const { rows } = await pool.query(
      `SELECT t.*, r.title AS raffle_title, r.description AS raffle_description,
              r.image_url AS raffle_image, r.image_urls AS raffle_image_urls,
              r.draw_date, r.status AS raffle_status, r.winning_ticket_id, r.winning_ticket_ids,
              u.name AS organizer_name, u.phone AS organizer_phone
         FROM raffle_tickets t
         JOIN raffles r ON r.id = t.raffle_id
         JOIN users u ON u.id = r.user_id
        WHERE t.validation_code = $1`,
      [code],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = rows[0];
    const winningIds = Array.isArray(ticket.winning_ticket_ids)
      ? ticket.winning_ticket_ids.map((value) => parseInt(value, 10)).filter(Boolean)
      : [];
    const isWinner = winningIds.includes(ticket.id) || (ticket.winning_ticket_id && ticket.winning_ticket_id === ticket.id);

    res.json({
      valid: true,
      isWinner,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        buyer_name: ticket.buyer_name,
        buyer_email: ticket.buyer_email,
        amount_paid: ticket.amount_paid,
        purchased_at: ticket.purchased_at,
        raffle_title: ticket.raffle_title,
        raffle_description: ticket.raffle_description,
        raffle_image: getPrimaryRaffleImage(ticket),
        draw_date: ticket.draw_date,
        organizer_name: ticket.organizer_name,
        organizer_phone: ticket.organizer_phone,
        raffle_status: ticket.raffle_status,
        is_winner: isWinner,
      },
    });
  } catch (err) {
    console.error('[Validate-Ticket] Error:', err);
    res.status(500).json({ error: 'Error al validar el ticket' });
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
    const userCredentials = (userData?.wompi_app_id && userData?.wompi_secret && userData?.wompi_validated)
      ? { appId: userData.wompi_app_id, secret: userData.wompi_secret }
      : null; // Usará las credenciales globales del .env

    const hasEnvCredentials = process.env.WOMPI_APP_ID && process.env.WOMPI_SECRET;
    if (!userCredentials && !hasEnvCredentials) {
      await client.query(`UPDATE raffles SET status='draft' WHERE id=$1`, [raffle.id]);
      await client.query('COMMIT');
      return res.status(400).json({
        error: 'Debes configurar y validar tus credenciales de Wompi antes de crear el enlace de pago.',
      });
    }

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
      console.error('[Wompi] Error creando enlace:', wompi.getWompiErrorMessage(wompiErr));
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
      validationCode:    ticket.validation_code || createValidationCode(ticket.raffle_id, ticket.ticket_number),
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
    const validationCode = ticket.validation_code || createValidationCode(ticket.raffle_id, ticket.ticket_number);

    if (!ticket.validation_code) {
      await pool.query('UPDATE raffle_tickets SET validation_code=$1 WHERE id=$2', [validationCode, ticket.id]);
      ticket.validation_code = validationCode;
    }

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
      validationCode,
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
      const validationCode = createValidationCode(raffle.id, ticketNumber);
      const txId = `CASH-${raffle.id}-${ticketNumber}-${Date.now().toString().slice(-4)}${quantity > 1 ? `-${index + 1}` : ''}`;

      const { rows: ticketRows } = await client.query(
        `INSERT INTO raffle_tickets
           (raffle_id, ticket_number, buyer_name, buyer_email,
            wompi_transaction_id, wompi_authorization_code, amount_paid, validation_code, status)
         VALUES($1,$2,$3,$4,$5,'CASH_OK',$6,$7,'confirmed') RETURNING *`,
        [raffle.id, ticketNumber, buyer_name, buyer_email, txId, raffle.ticket_price, validationCode],
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
        validationCode,
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

    const { rows: raffleAfterRows } = await client.query(
      'SELECT sold_tickets, total_tickets FROM raffles WHERE id=$1', [raffle.id],
    );
    if (raffleAfterRows[0]?.sold_tickets >= raffleAfterRows[0]?.total_tickets) {
      await selectAutomaticWinner(client, raffle.id);
    }

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
      const validationCode = createValidationCode(raffleId, ticketNumber);

      const { rows: insertedRows } = await client.query(
        `INSERT INTO raffle_tickets
           (raffle_id, ticket_number, buyer_name, buyer_email,
            wompi_transaction_id, wompi_authorization_code, amount_paid, validation_code, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,'confirmed') RETURNING *`,
        [raffleId, ticketNumber, buyer_name, buyer_email, uniqueTxId, null, raffle.ticket_price, validationCode],
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
        validationCode,
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

    const { rows: raffleAfterRows } = await client.query(
      'SELECT sold_tickets, total_tickets FROM raffles WHERE id=$1', [raffleId],
    );
    if (raffleAfterRows[0]?.sold_tickets >= raffleAfterRows[0]?.total_tickets) {
      await selectAutomaticWinner(client, raffleId);
    }

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

// ── Finalizar sorteo manual ───────────────────────────────────
router.post('/:id/manual-draw', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const raffleId = parseInt(req.params.id, 10);
    const { winner_ticket_id, winner_ticket_ids = [], eliminated_ticket_ids = [] } = req.body;
    const normalizedWinnerIds = Array.isArray(winner_ticket_ids) && winner_ticket_ids.length
      ? winner_ticket_ids
      : (winner_ticket_id ? [winner_ticket_id] : []);

    const { rows: raffleRows } = await client.query(
      'SELECT user_id, winning_ticket_id, status FROM raffles WHERE id=$1', [raffleId],
    );
    if (!raffleRows.length) {
      return res.status(404).json({ error: 'Rifa no encontrada' });
    }
    if (raffleRows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos' });
    }

    const { rows: ticketRows } = await client.query(
      'SELECT id FROM raffle_tickets WHERE raffle_id=$1', [raffleId],
    );
    if (!ticketRows.length) {
      return res.status(400).json({ error: 'No hay tickets para sortear' });
    }

    const result = await finalizeManualDraw(
      client,
      raffleId,
      normalizedWinnerIds,
      eliminated_ticket_ids,
    );

    await client.query('COMMIT');
    res.json({ success: true, ...result });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Manual-Draw] Error:', err);
    res.status(500).json({ error: err.message || 'No se pudo finalizar el sorteo' });
  } finally {
    client.release();
  }
});

// ── Validar ganador y canjear premio ──────────────────────────
router.post('/validate-winner', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'El código del ticket es requerido' });
    }

    if (!verifyValidationCode(code)) {
      return res.status(400).json({ error: 'Código de validación inválido' });
    }

    const { rows } = await client.query(
      `SELECT t.*, r.title AS raffle_title, r.description AS raffle_description,
              r.image_url AS raffle_image, r.image_urls AS raffle_image_urls,
              r.draw_date, r.status AS raffle_status, r.winning_ticket_id, r.winning_ticket_ids,
              r.user_id AS organizer_user_id, u.name AS organizer_name, u.phone AS organizer_phone
         FROM raffle_tickets t
         JOIN raffles r ON r.id = t.raffle_id
         JOIN users u ON u.id = r.user_id
        WHERE t.validation_code = $1`,
      [code],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = rows[0];
    if (ticket.organizer_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Este ticket no pertenece a tu rifa' });
    }

    const winningIds = Array.isArray(ticket.winning_ticket_ids)
      ? ticket.winning_ticket_ids.map((value) => parseInt(value, 10)).filter(Boolean)
      : [];
    const isWinner = winningIds.includes(ticket.id) || ticket.winning_ticket_id === ticket.id;

    if (!isWinner) {
      return res.status(400).json({ error: 'Este ticket no es ganador' });
    }

    if (ticket.status === 'redeemed') {
      return res.status(409).json({ error: 'Este ticket ya fue canjeado' });
    }

    await client.query(
      `UPDATE raffle_tickets
          SET status='redeemed', redeemed_at=NOW()
        WHERE id=$1`,
      [ticket.id],
    );

    const { sendWinnerValidationEmail } = require('../services/emailService');
    await sendWinnerValidationEmail({
      to: ticket.buyer_email,
      buyerName: ticket.buyer_name,
      buyerEmail: ticket.buyer_email,
      raffleTitle: ticket.raffle_title,
      ticketNumber: ticket.ticket_number,
      organizerName: ticket.organizer_name,
      organizerPhone: ticket.organizer_phone,
    });

    await client.query('COMMIT');
    res.json({
      success: true,
      validated: true,
      redeemed: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        buyer_name: ticket.buyer_name,
        buyer_email: ticket.buyer_email,
        organizer_name: ticket.organizer_name,
        organizer_phone: ticket.organizer_phone,
        raffle_title: ticket.raffle_title,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Validate-Winner] Error:', err);
    res.status(500).json({ error: err.message || 'No se pudo validar el ganador' });
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
