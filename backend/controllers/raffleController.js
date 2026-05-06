const raffleRepository = require('../repositories/raffleRepository');
const db = require('../config/db');

class RaffleController {
    async getAll(req, res) {
        try {
            const raffles = await raffleRepository.findAll();
            res.json(raffles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getOne(req, res) {
        try {
            const raffle = await raffleRepository.findById(req.params.id);
            if (!raffle) return res.status(404).json({ error: 'Rifa no encontrada' });
            res.json(raffle);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const raffleData = { ...req.body, usuario_id: req.user.id };
            const raffle = await raffleRepository.create(raffleData);
            res.status(201).json(raffle);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async selectWinner(req, res) {
        const { id } = req.params;
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const existing = await client.query('SELECT * FROM rifa_ganador WHERE rifa_id = $1', [id]);
            if (existing.rows.length > 0) throw new Error('Esta rifa ya tiene un ganador');

            const ticketRes = await client.query(`
                SELECT * FROM rifa_ticket 
                WHERE rifa_id = $1 AND estado IN ('pagado', 'entregado')
                ORDER BY RANDOM()
                LIMIT 1
            `, [id]);

            if (ticketRes.rows.length === 0) throw new Error('No hay tickets pagados para esta rifa');

            const winnerTicket = ticketRes.rows[0];

            const winnerRes = await client.query(
                'INSERT INTO rifa_ganador (rifa_id, ticket_id) VALUES ($1, $2) RETURNING *',
                [id, winnerTicket.id]
            );

            await client.query('UPDATE rifa SET estado = \'finalizada\' WHERE id = $1', [id]);

            await client.query('COMMIT');

            res.json({
                message: 'Ganador seleccionado exitosamente',
                winner: winnerRes.rows[0],
                ticket: winnerTicket
            });

        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: error.message });
        } finally {
            client.release();
        }
    }

    async getWinner(req, res) {
        try {
            const result = await db.query(`
                SELECT rg.*, rt.numero, rt.codigo, 
                COALESCE(u.nombre, p.nombre) as ganador_nombre
                FROM rifa_ganador rg
                JOIN rifa_ticket rt ON rg.ticket_id = rt.id
                LEFT JOIN usuario u ON rt.usuario_id = u.id
                LEFT JOIN participante p ON rt.participante_id = p.id
                WHERE rg.rifa_id = $1
            `, [req.params.id]);
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new RaffleController();
