CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    password TEXT,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE raffles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    prize TEXT,
    ticket_price NUMERIC(10,2),
    total_tickets INT,
    sold_tickets INT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE,
    raffle_id UUID,
    user_id UUID NULL,
    participant_id UUID NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (raffle_id) REFERENCES raffles(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID,
    amount NUMERIC(10,2),
    method VARCHAR(50),
    transaction_id TEXT,
    status VARCHAR(20),
    wompi_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE winners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raffle_id UUID UNIQUE,
    ticket_id UUID,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (raffle_id) REFERENCES raffles(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX idx_tickets_raffle ON tickets(raffle_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_payments_ticket ON payments(ticket_id);
CREATE INDEX idx_raffles_status ON raffles(status);

CREATE OR REPLACE FUNCTION check_ticket_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT sold_tickets FROM raffles WHERE id = NEW.raffle_id) >=
       (SELECT total_tickets FROM raffles WHERE id = NEW.raffle_id) THEN
        RAISE EXCEPTION 'No tickets available';
    END IF;

    UPDATE raffles
    SET sold_tickets = sold_tickets + 1
    WHERE id = NEW.raffle_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_limit
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION check_ticket_limit();