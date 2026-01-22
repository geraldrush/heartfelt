-- Add email verification fields
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires DATETIME;

-- Create index for verification token lookup
CREATE INDEX idx_users_verification_token ON users(email_verification_token);