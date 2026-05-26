const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const auth     = require('../middleware/auth');
const { validateCredentials } = require('../services/wompiService');
const router   = express.Router();

// ── Registro ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, wompi_app_id, wompi_secret } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'El correo ya está registrado' });

    // Validar credenciales de Wompi si se proporcionaron
    let wompiValidated = false;
    if (wompi_app_id && wompi_secret) {
      const result = await validateCredentials(wompi_app_id, wompi_secret);
      if (!result.valid) {
        return res.status(400).json({
          error: `Credenciales de Wompi inválidas: ${result.error}`,
        });
      }
      wompiValidated = true;
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users(name, email, password, wompi_app_id, wompi_secret, wompi_validated)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, wompi_app_id, wompi_validated, created_at`,
      [name, email, hash, wompi_app_id || null, wompi_secret || null, wompiValidated],
    );
    const user  = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, wompi_secret: __, ...safeUser } = user;
    // Indicar si tiene Wompi configurado sin revelar el secret
    safeUser.wompi_configured = !!(user.wompi_app_id && user.wompi_secret);
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Perfil ────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, avatar_url, wompi_app_id, wompi_validated, created_at
     FROM users WHERE id=$1`,
    [req.user.id],
  );
  const user = rows[0];
  // Consultar si tiene secret (sin revelarlo)
  const hasSecret = await pool.query(
    'SELECT wompi_secret IS NOT NULL AS has_secret FROM users WHERE id=$1',
    [req.user.id],
  );
  user.wompi_configured = !!(user.wompi_app_id && hasSecret.rows[0]?.has_secret);
  res.json(user);
});

// ── Configurar / Actualizar credenciales Wompi ────────────────
router.put('/wompi-config', auth, async (req, res) => {
  try {
    const { wompi_app_id, wompi_secret } = req.body;
    if (!wompi_app_id || !wompi_secret) {
      return res.status(400).json({ error: 'App ID y Secret de Wompi son requeridos' });
    }

    // Validar contra la API de Wompi
    const result = await validateCredentials(wompi_app_id, wompi_secret);
    if (!result.valid) {
      return res.status(400).json({
        error: `Credenciales de Wompi inválidas: ${result.error}`,
      });
    }

    await pool.query(
      `UPDATE users SET wompi_app_id=$1, wompi_secret=$2, wompi_validated=true WHERE id=$3`,
      [wompi_app_id, wompi_secret, req.user.id],
    );

    res.json({
      success: true,
      message: '✅ Cuenta de Wompi vinculada y validada exitosamente',
      wompi_app_id,
      wompi_validated: true,
      wompi_configured: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al configurar Wompi' });
  }
});

module.exports = router;
