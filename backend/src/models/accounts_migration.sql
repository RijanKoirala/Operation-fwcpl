-- ============================================================
-- Accounts Module: Complete Collection, Deposit, Bank Ledger & Expense Management Migration
-- ============================================================

-- 1. Accounts Table (Banks, Digital Wallets, Cash)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(100),
    account_name VARCHAR(150) NOT NULL UNIQUE,
    account_type VARCHAR(50) NOT NULL, -- 'BANK', 'DIGITAL_WALLET', 'CASH'
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);

-- Seed initial default accounts
INSERT INTO accounts (account_name, account_type, opening_balance) VALUES
    ('EBL', 'BANK', 0.00),
    ('NIMB', 'BANK', 0.00),
    ('NIC ASIA', 'BANK', 0.00),
    ('ESEWA-MERCHANT', 'DIGITAL_WALLET', 0.00),
    ('ESEWA', 'DIGITAL_WALLET', 0.00),
    ('KHALTI', 'DIGITAL_WALLET', 0.00),
    ('NEPALPAY', 'DIGITAL_WALLET', 0.00),
    ('CASH', 'CASH', 0.00)
ON CONFLICT (account_name) DO NOTHING;

-- 2. Ensure Branch Revenues table has required columns
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

ALTER TABLE branch_revenues ADD COLUMN IF NOT EXISTS collection_type VARCHAR(20) DEFAULT 'CASH';
ALTER TABLE branch_revenues ADD COLUMN IF NOT EXISTS received_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE branch_revenues ADD COLUMN IF NOT EXISTS revenue_code VARCHAR(50);

-- Safe migration rule for existing records without collection_type
UPDATE branch_revenues SET collection_type = 'LEGACY' WHERE collection_type IS NULL;

-- Backfill revenue_code if null
UPDATE branch_revenues 
SET revenue_code = 'REV-' || LPAD(id::text, 5, '0') 
WHERE revenue_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_branch_revenues_branch ON branch_revenues(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_date ON branch_revenues(revenue_date DESC);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_status ON branch_revenues(status);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_created_at ON branch_revenues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_type ON branch_revenues(collection_type);
CREATE INDEX IF NOT EXISTS idx_branch_revenues_account ON branch_revenues(received_account_id);

-- 3. Cash Deposits Table
CREATE TABLE IF NOT EXISTS cash_deposits (
    id SERIAL PRIMARY KEY,
    deposit_code VARCHAR(50) NOT NULL UNIQUE,
    revenue_id INTEGER NOT NULL REFERENCES branch_revenues(id) ON DELETE RESTRICT,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    deposit_date DATE NOT NULL,
    total_deposit_amount NUMERIC(15, 2) NOT NULL CHECK (total_deposit_amount > 0),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_deposits_revenue ON cash_deposits(revenue_id);
CREATE INDEX IF NOT EXISTS idx_cash_deposits_branch ON cash_deposits(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_deposits_date ON cash_deposits(deposit_date DESC);

-- 4. Cash Deposit Allocations Table (Split deposits)
CREATE TABLE IF NOT EXISTS cash_deposit_allocations (
    id SERIAL PRIMARY KEY,
    deposit_id INTEGER NOT NULL REFERENCES cash_deposits(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_deposit_allocations_dep ON cash_deposit_allocations(deposit_id);
CREATE INDEX IF NOT EXISTS idx_cash_deposit_allocations_acc ON cash_deposit_allocations(account_id);

-- 5. Account Expenses / Payments Table
CREATE TABLE IF NOT EXISTS account_expenses (
    id SERIAL PRIMARY KEY,
    expense_code VARCHAR(50) NOT NULL UNIQUE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    paid_to VARCHAR(255) NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    attachment_url TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_expenses_account ON account_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_account_expenses_date ON account_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_expenses_category ON account_expenses(category);

-- 6. Account Internal Transfers Table
CREATE TABLE IF NOT EXISTS account_transfers (
    id SERIAL PRIMARY KEY,
    transfer_code VARCHAR(50) NOT NULL UNIQUE,
    from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    transfer_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    reference_number VARCHAR(100),
    remarks TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_transfers_from ON account_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_to ON account_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_date ON account_transfers(transfer_date DESC);

-- 7. Unified Account Transactions Ledger
CREATE TABLE IF NOT EXISTS account_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL, -- 'OPENING_BALANCE', 'ONLINE_COLLECTION', 'CASH_COLLECTION', 'CASH_DEPOSIT', 'EXPENSE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT'
    transaction_date DATE NOT NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
    revenue_id INTEGER REFERENCES branch_revenues(id) ON DELETE SET NULL,
    deposit_id INTEGER REFERENCES cash_deposits(id) ON DELETE SET NULL,
    allocation_id INTEGER REFERENCES cash_deposit_allocations(id) ON DELETE SET NULL,
    expense_id INTEGER REFERENCES account_expenses(id) ON DELETE SET NULL,
    transfer_id INTEGER REFERENCES account_transfers(id) ON DELETE SET NULL,
    description TEXT,
    reference_number VARCHAR(100),
    credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);

CREATE INDEX IF NOT EXISTS idx_account_txns_account ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_txns_date ON account_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_txns_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_account_txns_revenue ON account_transactions(revenue_id);
CREATE INDEX IF NOT EXISTS idx_account_txns_deposit ON account_transactions(deposit_id);
CREATE INDEX IF NOT EXISTS idx_account_txns_expense ON account_transactions(expense_id);
CREATE INDEX IF NOT EXISTS idx_account_txns_transfer ON account_transactions(transfer_id);
