-- Migration: Operation Center Module
-- Sequence for Ticket ID: OP-00001, OP-00002, etc.
CREATE SEQUENCE IF NOT EXISTS operation_ticket_seq START 1;

-- Operation Tickets table
CREATE TABLE IF NOT EXISTS operation_tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ('OP-' || LPAD(nextval('operation_ticket_seq')::text, 5, '0')),
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    resolution TEXT,
    closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_tickets_branch ON operation_tickets(branch_id);
CREATE INDEX IF NOT EXISTS idx_operation_tickets_status ON operation_tickets(status);
CREATE INDEX IF NOT EXISTS idx_operation_tickets_created_at ON operation_tickets(created_at);

-- Operation Ticket Attachments table
CREATE TABLE IF NOT EXISTS operation_ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES operation_tickets(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_op_ticket_attachments_ticket ON operation_ticket_attachments(ticket_id);

-- Operation Ticket Updates / Timeline table
CREATE TABLE IF NOT EXISTS operation_ticket_updates (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES operation_tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    update_type VARCHAR(50) NOT NULL,
    message TEXT,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_op_ticket_updates_ticket ON operation_ticket_updates(ticket_id);
