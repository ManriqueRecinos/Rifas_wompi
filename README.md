# RifaPremium - Sistema de Gestión de Rifas

Este proyecto es una solución completa para la gestión de rifas con integración de pagos Wompi, diseñado con una estética premium y arquitectura escalable.

## Características
- **Autenticación**: Registro y Login con JWT y encriptación bcrypt.
- **Rifas**: Creación, visualización y gestión de progreso de ventas.
- **Pagos**: Integración real con Wompi (Checkout) y opción de Contraentrega.
- **Seguridad**: Prevención de sobreventa mediante transacciones PostgreSQL (`FOR UPDATE`).
- **Expiración**: Los tickets reservados expiran automáticamente si no se pagan en 15 minutos.
- **Sorteo**: Selección aleatoria de ganadores entre tickets pagados.

## Tecnologías
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide Icons, React Query.
- **Backend**: Node.js, Express, PostgreSQL, node-cron, Axios.
- **Base de Datos**: PostgreSQL (Supabase/AWS).

## Instalación

### Backend
1. Navegar a `backend/`
2. Ejecutar `npm install`
3. Configurar `.env` (ya preconfigurado con tus credenciales)
4. Ejecutar el script `db_init.sql` en tu base de datos.
5. Iniciar con `node index.js`

### Frontend
1. Navegar a `frontend/`
2. Ejecutar `npm install`
3. Iniciar con `npm run dev`

## Endpoints Principales
- `POST /api/auth/register`: Registro de usuarios.
- `POST /api/auth/login`: Inicio de sesión.
- `GET /api/rifas`: Listado de rifas públicas.
- `POST /api/pagos/crear`: Crea orden de pago y reserva tickets (Maneja usuarios y participantes).
- `POST /api/rifas/:id/sorteo`: Ejecuta el sorteo (Solo creador).
- `POST /api/webhook/wompi`: Endpoint para confirmación automática de pagos.

## Estética Premium
Se ha utilizado una paleta de colores oscura con acentos en violeta/indigo, efectos de cristal (glassmorphism), tipografía moderna (Inter) y animaciones fluidas con Framer Motion.
