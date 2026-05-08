const axios = require('axios');
const db = require('../config/db');
const ticketRepository = require('../repositories/ticketRepository');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
    async getWompiToken() {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', process.env.WOMPI_APP_ID);
            params.append('client_secret', process.env.WOMPI_SECRET);
            params.append('audience', 'wompi_api');

            const response = await axios.post('https://id.wompi.sv/connect/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            return response.data.access_token;
        } catch (error) {
            console.error('Error obteniendo token de Wompi:', error.response?.data || error.message);
            throw new Error('No se pudo autenticar con Wompi');
        }
    }

    async createOrder(data) {
        const { rifa_id, cantidad, metodo_pago, user_info, usuario_id } = data;
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const raffleRes = await client.query('SELECT * FROM rifa WHERE id = $1 FOR UPDATE', [rifa_id]);
            const raffle = raffleRes.rows[0];
            if (!raffle || raffle.estado !== 'activa') throw new Error('Rifa no disponible');

            const totalMonto = raffle.precio * cantidad;

            let currentParticipanteId = null;
            let userEmail = '';
            let finalUsuarioId = usuario_id;

            // CAMBIO: Si hay user_info (registro manual o invitado), creamos un participante
            if (user_info) {
                const partRes = await client.query(
                    'INSERT INTO participante (nombre, correo, telefono) VALUES ($1, $2, $3) RETURNING id, correo',
                    [user_info.nombre, user_info.correo, user_info.telefono]
                );
                currentParticipanteId = partRes.rows[0].id;
                userEmail = partRes.rows[0].correo;
                // Si estamos registrando un participante, la orden NO es para el usuario logueado (admin)
                finalUsuarioId = null;
            } else if (usuario_id) {
                const userRes = await client.query('SELECT correo FROM usuario WHERE id = $1', [usuario_id]);
                userEmail = userRes.rows[0].correo;
            }

            const metodoRes = await client.query('SELECT id FROM metodo_pago WHERE nombre = $1', [metodo_pago]);
            const metodo_id = metodoRes.rows[0].id;

            const ordenRes = await client.query(
                'INSERT INTO orden_pago (usuario_id, participante_id, metodo_pago_id, monto, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [finalUsuarioId, currentParticipanteId, metodo_id, totalMonto, metodo_pago === 'contraentrega' ? 'pagado' : 'pendiente']
            );
            const orden_id = ordenRes.rows[0].id;

            // Si es contraentrega, marcamos los tickets como entregados/pagados de una vez
            const estadoTicket = metodo_pago === 'contraentrega' ? 'entregado' : 'reservado';
            
            await ticketRepository.createReservedTickets(client, rifa_id, cantidad, finalUsuarioId, currentParticipanteId, orden_id);
            
            if (metodo_pago === 'contraentrega') {
                await ticketRepository.updateTicketsByOrden(orden_id, 'entregado');
            }

            let checkout_url = null;

            if (metodo_pago === 'wompi') {
                const accessToken = await this.getWompiToken();
                const wompiData = {
                    identificadorEnlaceComercio: orden_id,
                    monto: totalMonto,
                    nombreProducto: `Tickets Rifa: ${raffle.nombre}`,
                    configuracion: {
                        urlRedirect: `${process.env.FRONTEND_URL}/pago-confirmacion/${orden_id}`,
                        esMontoEditable: false,
                        esCantidadEditable: false,
                        emailsNotificacion: userEmail || "notificaciones@tuapp.com"
                    }
                };

                const response = await axios.post('https://api.wompi.sv/EnlacePago', wompiData, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                checkout_url = response.data.urlEnlace;
                await client.query('UPDATE orden_pago SET referencia_externa = $1 WHERE id = $2', [response.data.idEnlace, orden_id]);
            }

            await client.query('COMMIT');
            return { orden_id, checkout_url };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating order:', error.response?.data || error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async handleWebhook(payload) {
        console.log('Recibiendo Webhook de Wompi:', JSON.stringify(payload, null, 2));

        // Enlaces de pago de Wompi suelen enviar idEnlace y estado
        const { idEnlace, estado, identificadorEnlaceComercio } = payload;
        
        // El identificadorEnlaceComercio es nuestro orden_id (lo enviamos al crear el enlace)
        const orden_id = identificadorEnlaceComercio;

        try {
            if (estado === 'Pagado') {
                console.log(`Pago confirmado para la orden: ${orden_id}`);
                
                // 1. Actualizar estado de la orden
                await db.query(
                    'UPDATE orden_pago SET estado = \'pagado\' WHERE id = $1 OR referencia_externa = $2',
                    [orden_id, idEnlace]
                );

                // 2. Actualizar tickets asociados a esa orden a estado 'pagado'
                // Esto es lo que confirma la venta final
                await ticketRepository.updateTicketsByOrden(orden_id, 'pagado');
                
                console.log(`Tickets de la orden ${orden_id} marcados como PAGADOS.`);
            } else if (estado === 'Fallido' || estado === 'Rechazado') {
                console.log(`Pago fallido para la orden: ${orden_id}`);
                await db.query(
                    'UPDATE orden_pago SET estado = \'fallido\' WHERE id = $1 OR referencia_externa = $2',
                    [orden_id, idEnlace]
                );
            }
        } catch (error) {
            console.error('Error procesando webhook:', error.message);
            throw error;
        }
    }
}

module.exports = new PaymentService();
