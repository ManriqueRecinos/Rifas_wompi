const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const auth     = require('../middleware/auth');
const { validateCredentials } = require('../services/wompiService');
const router   = express.Router();
const ADMIN_EMAIL = 'manrique.recinos23@gmail.com';

function isAdminUser(req) {
  return req.user?.email === ADMIN_EMAIL;
}

// ── Registro ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, wompi_app_id, wompi_secret } = req.body;
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
      `INSERT INTO users(name, email, password, phone, wompi_app_id, wompi_secret, wompi_validated)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, name, email, phone, wompi_app_id, wompi_validated, created_at`,
      [name, email, hash, phone || null, wompi_app_id || null, wompi_secret || null, wompiValidated],
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
    `SELECT id, name, email, phone, avatar_url, wompi_app_id, wompi_validated, created_at
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

// ── Admin: listar usuarios ────────────────────────────────────
router.get('/admin/users', auth, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'Sin permisos para ver usuarios' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, phone, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ── Admin: cambiar contraseña de cualquier usuario ───────────
router.put('/admin/users/:id/password', auth, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'Sin permisos para cambiar contraseñas' });
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await pool.query(
      'UPDATE users SET password=$1 WHERE id=$2',
      [hash, req.params.id],
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

module.exports = router;
