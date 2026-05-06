const db = require('../config/db');

class TicketRepository {
    async getReservedCount(rifa_id) {
        const result = await db.query(
            'SELECT COUNT(*) FROM rifa_ticket WHERE rifa_id = $1 AND (estado = $2 OR estado = $3 OR estado = $4)',
            [rifa_id, 'reservado', 'pagado', 'entregado']
        );
        return parseInt(result.rows[0].count);
    }

    async createReservedTickets(client, rifa_id, count, usuario_id, participante_id, orden_id) {
        const existingNumbersResult = await client.query(
            'SELECT numero FROM rifa_ticket WHERE rifa_id = $1',
            [rifa_id]
        );
        const existingNumbers = new Set(existingNumbersResult.rows.map(r => r.numero));
        
        const raffleResult = await client.query('SELECT cantidad_tickets FROM rifa WHERE id = $1', [rifa_id]);
        const totalTickets = raffleResult.rows[0].cantidad_tickets;

        const reservedTickets = [];
        let currentNum = 1;
        
        while (reservedTickets.length < count && currentNum <= totalTickets) {
            if (!existingNumbers.has(currentNum)) {
                // Usamos solo las columnas de tu esquema original
                const result = await client.query(
                    'INSERT INTO rifa_ticket (rifa_id, numero, usuario_id, participante_id, orden_id, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    [rifa_id, currentNum, usuario_id, participante_id, orden_id, 'reservado']
                );
                reservedTickets.push(result.rows[0]);
                existingNumbers.add(currentNum);
            }
            currentNum++;
        }

        if (reservedTickets.length < count) {
            throw new Error('No hay suficientes tickets disponibles');
        }

        return reservedTickets;
    }

    async updateTicketsByOrden(orden_id, newEstado) {
        await db.query(
            'UPDATE rifa_ticket SET estado = $1 WHERE orden_id = $2',
            [newEstado, orden_id]
        );
    }

    async deleteExpiredTickets() {
        // Lógica de expiración basada en fecha_creacion (15 minutos)
        const result = await db.query(
            'DELETE FROM rifa_ticket WHERE estado = \'reservado\' AND fecha_creacion < NOW() - INTERVAL \'15 minutes\' RETURNING orden_id'
        );
        return result.rows;
    }
}

module.exports = new TicketRepository();
