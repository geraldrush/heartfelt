-- Update existing packages and add 2 more for 5 total packages
-- R50, R100, R200, R500, R1000 (R10 per token)

UPDATE tokens SET name = '5 Tokens', amount = 5, price_cents = 5000, currency = 'ZAR', is_active = 1
WHERE id = 'e56c053b-990b-49fd-b645-b485ffe48e3e';

UPDATE tokens SET name = '10 Tokens', amount = 10, price_cents = 10000, currency = 'ZAR', is_active = 1
WHERE id = 'f12a2c7e-3e31-477d-87b3-a6f20f485c07';

UPDATE tokens SET name = '20 Tokens', amount = 20, price_cents = 20000, currency = 'ZAR', is_active = 1
WHERE id = '5a928f6f-c3e4-4209-8c63-24f40c687c1a';

-- Add 2 new packages
INSERT INTO tokens (id, name, amount, price_cents, currency, is_active)
VALUES
  ('a1b2c3d4-e5f6-4789-a012-3456789abcde', '50 Tokens', 50, 50000, 'ZAR', 1),
  ('b2c3d4e5-f6a7-4890-b123-456789abcdef', '100 Tokens', 100, 100000, 'ZAR', 1)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  amount = excluded.amount,
  price_cents = excluded.price_cents,
  is_active = excluded.is_active;
