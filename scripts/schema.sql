-- HRHS Inventory — database schema
-- Run this in Supabase SQL Editor before seeding

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  brand       text,
  quantity    integer     NOT NULL CHECK (quantity >= 0),
  unit        text        NOT NULL,
  expiry      date        NOT NULL,
  location    text        NOT NULL,
  logged_by   text        NOT NULL,
  notes       text,
  status      text        NOT NULL DEFAULT 'available',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Read: anyone (anon guests + authenticated admins)
CREATE POLICY "Anyone can read items"
  ON items FOR SELECT
  USING (true);

-- Write: authenticated only
CREATE POLICY "Authenticated users can insert"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update"
  ON items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete"
  ON items FOR DELETE
  TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS items_expiry_idx   ON items (expiry ASC);
CREATE INDEX IF NOT EXISTS items_location_idx ON items (location);
CREATE INDEX IF NOT EXISTS items_status_idx   ON items (status);
