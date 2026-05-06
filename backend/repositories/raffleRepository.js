const db = require('../config/db');

class RaffleRepository {
    async create(raffleData) {
        const { usuario_id, nombre, descripcion, precio, cantidad_tickets, fecha_sorteo, especificaciones, imagenes } = raffleData;
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            const result = await client.query(
                'INSERT INTO rifa (usuario_id, nombre, descripcion, precio, cantidad_tickets, fecha_sorteo, especificaciones) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [usuario_id, nombre, descripcion, precio, cantidad_tickets, fecha_sorteo, JSON.stringify(especificaciones || {})]
            );
            const rifa = result.rows[0];

            if (imagenes && imagenes.length > 0) {
                for (let i = 0; i < imagenes.length; i++) {
                    await client.query(
                        'INSERT INTO rifa_imagen (rifa_id, url, orden) VALUES ($1, $2, $3)',
                        [rifa.id, imagenes[i], i]
                    );
                }
            }

            await client.query('COMMIT');
            return rifa;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll() {
        // Obtenemos todas las rifas
        const rafflesRes = await db.query(`
            SELECT r.*, 
            (SELECT COUNT(*) FROM rifa_ticket rt WHERE rt.rifa_id = r.id AND rt.estado IN ('pagado', 'entregado')) as vendidos
            FROM rifa r 
            ORDER BY r.fecha_creacion DESC
        `);

        const raffles = rafflesRes.rows;

        // Para cada rifa, adjuntamos sus imágenes
        for (let raffle of raffles) {
            const imagesRes = await db.query(
                'SELECT url FROM rifa_imagen WHERE rifa_id = $1 ORDER BY orden ASC',
                [raffle.id]
            );
            raffle.imagenes = imagesRes.rows.map(img => img.url);
        }

        return raffles;
    }

    async findById(id) {
        const raffleRes = await db.query(`
            SELECT r.*, 
            (SELECT COUNT(*) FROM rifa_ticket rt WHERE rt.rifa_id = r.id AND rt.estado IN ('pagado', 'entregado')) as vendidos
            FROM rifa r 
            WHERE r.id = $1
        `, [id]);
        
        const raffle = raffleRes.rows[0];
        if (raffle) {
            const imagesRes = await db.query('SELECT url FROM rifa_imagen WHERE rifa_id = $1 ORDER BY orden ASC', [id]);
            raffle.imagenes = imagesRes.rows.map(img => img.url);
        }
        
        return raffle;
    }

    async updateStatus(id, estado) {
        await db.query('UPDATE rifa SET estado = $1 WHERE id = $2', [estado, id]);
    }
}

module.exports = new RaffleRepository();
