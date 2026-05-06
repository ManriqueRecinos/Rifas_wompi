-- =========================================================
-- SCRIPT DE INICIALIZACIÓN MAESTRA - RIFAPREMIUM MVP
-- =========================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USUARIO (Administradores)
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    contrasenia TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PARTICIPANTE (Para compras sin login o registros manuales)
CREATE TABLE participante (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150),
    telefono VARCHAR(20),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. RIFA (Estructura Inteligente)
CREATE TABLE rifa (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    cantidad_tickets INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'activa', -- activa, finalizada, cancelada
    especificaciones JSONB DEFAULT '{}', -- Datos técnicos (CC, RPM, etc.)
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_sorteo TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 5. IMÁGENES DE RIFA (Para el Carrusel Premium)
CREATE TABLE rifa_imagen (
    id SERIAL PRIMARY KEY,
    rifa_id INTEGER NOT NULL REFERENCES rifa(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INTEGER DEFAULT 0
);

-- 6. METODO DE PAGO
CREATE TABLE metodo_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE -- wompi, contraentrega
);

INSERT INTO metodo_pago(nombre) VALUES 
('wompi'),
('contraentrega');

-- 7. ORDEN DE PAGO (ID por UUID para seguridad con Wompi)
CREATE TABLE orden_pago (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id INTEGER NULL,
    participante_id INTEGER NULL,
    metodo_pago_id INTEGER NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagado, fallido
    referencia_externa VARCHAR(255), -- ID de enlace Wompi
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (participante_id) REFERENCES participante(id),
    FOREIGN KEY (metodo_pago_id) REFERENCES metodo_pago(id)
);

-- 8. TICKETS
CREATE TABLE rifa_ticket (
    id SERIAL PRIMARY KEY,
    rifa_id INTEGER NOT NULL,
    numero INTEGER NOT NULL, -- Número visible
    codigo UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    usuario_id INTEGER NULL,
    participante_id INTEGER NULL,
    orden_id UUID NULL,

    estado VARCHAR(20) DEFAULT 'reservado', -- reservado, pagado, entregado
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rifa_id) REFERENCES rifa(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    FOREIGN KEY (participante_id) REFERENCES participante(id),
    FOREIGN KEY (orden_id) REFERENCES orden_pago(id),

    UNIQUE(rifa_id, numero)
);

-- 9. GANADOR
CREATE TABLE rifa_ganador (
    id SERIAL PRIMARY KEY,
    rifa_id INTEGER UNIQUE,
    ticket_id INTEGER UNIQUE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rifa_id) REFERENCES rifa(id),
    FOREIGN KEY (ticket_id) REFERENCES rifa_ticket(id)
);

-- 10. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_ticket_rifa ON rifa_ticket(rifa_id);
CREATE INDEX idx_ticket_usuario ON rifa_ticket(usuario_id);
CREATE INDEX idx_orden_estado ON orden_pago(estado);
CREATE INDEX idx_rifa_fecha ON rifa(fecha_creacion);
