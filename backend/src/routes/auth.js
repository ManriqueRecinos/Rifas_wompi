const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const router   = express.Router();

// ── Registro ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'El correo ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING id,name,email,created_at',
      [name, email, hash],
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
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Perfil ────────────────────────────────────────────────────
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,name,email,avatar_url,created_at FROM users WHERE id=$1',
    [req.user.id],
  );
  res.json(rows[0]);
});

module.exports = router;
