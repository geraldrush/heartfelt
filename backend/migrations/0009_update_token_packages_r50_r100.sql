-- Update token packages to start from R50 to R1000
-- Maintaining R10 per token price

UPDATE tokens SET name = '5 Tokens', amount = 5, price_cents = 5000, currency = 'ZAR', is_active = 1
WHERE id = 'e56c053b-990b-49fd-b645-b485ffe48e3e';

UPDATE tokens SET name = '50 Tokens', amount = 50, price_cents = 50000, currency = 'ZAR', is_active = 1
WHERE id = 'f12a2c7e-3e31-477d-87b3-a6f20f485c07';

UPDATE tokens SET name = '100 Tokens', amount = 100, price_cents = 100000, currency = 'ZAR', is_active = 1
WHERE id = '5a928f6f-c3e4-4209-8c63-24f40c687c1a';
