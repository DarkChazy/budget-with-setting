-- Placeholder seed users. Real password hashes are created by /register.
-- Recommended: delete these rows and register Helly + Chazy via the UI on first run.
INSERT INTO users (id, name, email, password_hash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Helly', 'helly@local', 'scrypt$00$00'),
  ('22222222-2222-2222-2222-222222222222', 'Chazy', 'chazy@local', 'scrypt$00$00')
ON CONFLICT (email) DO NOTHING;