-- Asset Types table
CREATE TABLE IF NOT EXISTS asset_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branch Assets table
CREATE TABLE IF NOT EXISTS branch_assets (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  asset_type_id INTEGER NOT NULL REFERENCES asset_types(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(branch_id, asset_type_id)
);

-- Seed initial asset types
INSERT INTO asset_types (name) VALUES
  ('Splicing Machine'),('OTDR'),('Power Meter'),('Fusion Splicer'),
  ('Fiber Cleaver'),('VFL'),('Optical Power Meter'),('Motorbike'),
  ('Vehicle'),('Car'),('Pickup'),('AC'),('Refrigerator'),('Computer'),
  ('Laptop'),('Printer'),('UPS'),('Router'),('Switch'),('Wi-Fi Router'),
  ('Rack'),('Office Table'),('Office Chair'),('Cabinet'),('Sofa'),
  ('Generator'),('Inverter'),('Battery'),('Telephone'),('CCTV'),
  ('Projector'),('Other')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_branch_assets_branch_id ON branch_assets(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_assets_asset_type_id ON branch_assets(asset_type_id);
