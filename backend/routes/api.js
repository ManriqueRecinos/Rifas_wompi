const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const raffleController = require('../controllers/raffleController');
const cloudinaryController = require('../controllers/cloudinaryController');
const paymentService = require('../services/paymentService');
const auth = require('../middleware/auth');
const db = require('../config/db');

// --- Cloudinary ---
router.get('/cloudinary/signature', auth, cloudinaryController.getSignature);

// --- Auth Routes ---
router.post('/auth/register', async (req, res) => {
    try {
        const result = await require('../services/authService').register(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const result = await require('../services/authService').login(req.body.correo, req.body.contrasenia);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// --- Raffle Routes ---
router.get('/rifas', raffleController.getAll);
router.get('/rifas/:id', raffleController.getOne);
router.post('/rifas', auth, raffleController.create);
router.post('/rifas/:id/sorteo', auth, raffleController.selectWinner);
router.get('/rifas/:id/ganador', raffleController.getWinner);

// --- Payment & Tickets ---
router.post('/pagos/crear', async (req, res) => {
    try {
        // Optional auth
        const authHeader = req.headers['authorization'];
        let usuario_id = null;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                usuario_id = decoded.id;
            } catch (e) {}
        }
        
        const result = await paymentService.createOrder({ ...req.body, usuario_id });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Wompi Webhook
router.post('/webhook/wompi', async (req, res) => {
    try {
        await paymentService.handleWebhook(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

// Dashboard info
router.get('/dashboard/stats', auth, async (req, res) => {
    try {
        const myRifas = await db.query('SELECT * FROM rifa WHERE usuario_id = $1', [req.user.id]);
        res.json(myRifas.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
