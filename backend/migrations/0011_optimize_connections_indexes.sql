-- Add composite index for connection verification queries
CREATE INDEX IF NOT EXISTS idx_connections_id_status 
ON connections(id, status);

-- Add index for status-based queries
CREATE INDEX IF NOT EXISTS idx_connections_status 
ON connections(status);

-- Verify existing indexes are present
-- idx_connections_user1 and idx_connections_user2 should already exist from 0001_initial_schema.sql