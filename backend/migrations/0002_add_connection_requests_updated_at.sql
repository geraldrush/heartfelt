-- Add missing updated_at column to connection_requests table
ALTER TABLE connection_requests ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have updated_at = created_at
UPDATE connection_requests SET updated_at = created_at WHERE updated_at IS NULL;