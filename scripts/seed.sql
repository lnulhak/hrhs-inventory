-- HRHS Inventory — sample seed data
-- Run this in Supabase SQL Editor after schema.sql

INSERT INTO items (name, brand, quantity, unit, expiry, location, logged_by, notes, status) VALUES
  ('Wholemeal Bread',  'Gardenia',   12, 'loaves',  '2026-06-15', 'Location 2', 'Volunteer 1', 'From Gardenia donation',  'available'),
  ('Fresh Milk 1L',    'Meiji',      24, 'cartons', '2026-06-20', 'Location 1', 'Volunteer 2', NULL,                      'available'),
  ('Canned Tuna',      'Ayam Brand', 80, 'cans',    '2027-03-15', 'Location 1', 'Volunteer 2', 'From corporate drive',    'available'),
  ('Bananas',          NULL,          6, 'kg',      '2026-06-10', 'Location 3', 'Volunteer 3', 'Returned from Sat event', 'available'),
  ('Instant Noodles',  'Maggi',      50, 'packs',   '2026-08-20', 'Location 2', 'Volunteer 1', NULL,                      'available');
