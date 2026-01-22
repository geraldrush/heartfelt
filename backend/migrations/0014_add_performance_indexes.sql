-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_status_created ON messages(status, created_at);
CREATE INDEX IF NOT EXISTS idx_connection_requests_expires ON connection_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type_created ON token_transactions(transaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_stories_active_created ON stories(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);