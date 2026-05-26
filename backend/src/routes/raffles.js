const express         = require('express');
const multer          = require('multer');
const pool            = require('../db');
const auth            = require('../middleware/auth');
const wompi           = require('../services/wompiService');
const { uploadImage } = require('../services/cloudinaryService');
const router          = express.Router();
const upload          = multer({ dest: '/tmp/' });

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
router.post('/', auth, upload.single('image'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { title, description, ticket_price, total_tickets, draw_date } = req.body;
    if (!title || !ticket_price || !total_tickets)
      return res.status(400).json({ error: 'title, ticket_price y total_tickets son requeridos' });

    // Subir imagen si se adjuntó
    let image_url = null;
    if (req.file) {
      image_url = await uploadImage(req.file.path, 'rifas');
    }

    // Insertar rifa en DB
    const { rows } = await client.query(
      `INSERT INTO raffles(user_id,title,description,image_url,ticket_price,total_tickets,draw_date,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,'draft') RETURNING *`,
      [req.user.id, title, description, image_url, ticket_price, total_tickets, draw_date || null],
    );
    const raffle = rows[0];

    // Crear enlace de pago en Wompi
    let wompiData = {};
    try {
      wompiData = await wompi.createPaymentLink(raffle);
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
