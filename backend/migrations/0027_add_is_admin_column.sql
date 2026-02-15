-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);
