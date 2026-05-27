# 🎟️ Rifas App — Guía de Instalación Completa

## Arranque rápido

Desde la raíz del proyecto puedes ejecutar el script `start-dev.bat` para levantar backend y frontend a la vez:

```bat
start-dev.bat
```

El script instala dependencias solo si falta `node_modules` y abre dos ventanas de consola, una para cada servidor.

## Requisitos previos
- Node.js 18+
- npm o yarn
- Cuenta en [Supabase](https://supabase.com) (PostgreSQL) — ya configurada en el .env
- Cuenta en [Cloudinary](https://cloudinary.com) — ya configurada en el .env
- Cuenta en Wompi El Salvador — ya configurada en el .env
- (Opcional para correos) Cuenta SMTP / Gmail

---

## 1. Configurar la base de datos

En tu panel de Supabase, abre el **SQL Editor** y ejecuta:

```sql
-- Pega el contenido de: backend/src/migrations/001_init.sql
```

---

## 2. Backend

```bash
cd backend
npm install
```

### Agregar variables de correo al .env (opcional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuemail@gmail.com
SMTP_PASS=tu_app_password_gmail
```

> Para Gmail: activa **verificación en 2 pasos** → genera una **App Password** en
> https://myaccount.google.com/apppasswords

```bash
npm run dev
# Backend en http://10.10.15.6:3001
```

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend en http://10.10.15.6:5173
```

---

## 4. Webhook de Wompi (IMPORTANTE)

Wompi necesita una URL **pública** para enviarte notificaciones de pago.
En desarrollo local, usa **ngrok**:

```bash
# Instalar ngrok: https://ngrok.com/download
ngrok http 3001
```

Copia la URL HTTPS que te da (ej: `https://abc123.ngrok.io`) y agrégala al `.env` como `BACKEND_URL`:

```env
BACKEND_URL=https://abc123.ngrok.io
```

Reinicia el backend. De ahora en adelante, cada rifa que crees usará esa URL como webhook.

---

## 5. Flujo completo de prueba

1. Regístrate en `/register`
2. Ve a `/create` y crea una rifa
3. Si Wompi está configurado, verás `wompi_url_enlace` en la respuesta
4. Ve a la página de la rifa → haz clic en **Comprar Ticket**
5. Serás redirigido a la pantalla de pago de Wompi
6. Paga (usa tarjeta de prueba de Wompi si estás en sandbox)
7. Wompi llama al webhook → se genera el ticket → se envía por correo
8. Wompi redirige a `/payment/result?esAprobada=true&...`

---

## 6. Tarjetas de prueba (Wompi Sandbox)

Consulta las tarjetas de prueba en:
https://docs.wompi.sv/metodos-api/transaccion_prueba

---

## Estructura del proyecto

```
rifas/
├── backend/
│   ├── src/
│   │   ├── index.js                   ← Servidor Express
│   │   ├── db.js                      ← Conexión PostgreSQL
│   │   ├── middleware/auth.js          ← JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js                ← /api/auth
│   │   │   ├── raffles.js             ← /api/raffles
│   │   │   └── webhooks.js            ← /api/webhooks/wompi ⭐
│   │   ├── services/
│   │   │   ├── wompiService.js        ← OAuth + Enlace de Pago ⭐
│   │   │   ├── ticketService.js       ← Generación PDF ⭐
│   │   │   ├── emailService.js        ← Envío de correo ⭐
│   │   │   └── cloudinaryService.js   ← Subida de archivos
│   │   └── migrations/001_init.sql    ← Schema DB
│   └── .env
└── frontend/
    └── src/
        ├── App.jsx                    ← Router
        ├── hooks/useAuth.jsx          ← Auth context
        ├── services/api.js            ← Axios config
        ├── components/
        │   ├── Navbar.jsx
        │   └── RaffleCard.jsx
        └── pages/
            ├── Home.jsx               ← Listado rifas
            ├── RaffleDetail.jsx       ← Detalle + botón compra ⭐
            ├── CreateRaffle.jsx       ← Crear rifa + enlace Wompi ⭐
            ├── Dashboard.jsx          ← Mis rifas
            ├── Auth.jsx               ← Login / Register
            └── PaymentResult.jsx      ← Resultado del pago ⭐
```
