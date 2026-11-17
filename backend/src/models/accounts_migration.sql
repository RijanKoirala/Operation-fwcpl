-- ============================================================
-- Accounts Module: Branch Revenue Management Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS branch_revenues (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    revenue_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_branch_revenues_branch ON branch_revenues(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_date ON branch_revenues(revenue_date DESC);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_status ON branch_revenues(status);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_created_at ON branch_revenues(created_at DESC);
