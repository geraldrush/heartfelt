-- Add password reset fields
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires DATETIME;

-- Create index for reset token lookup
CREATE INDEX idx_users_reset_token ON users(password_reset_token);