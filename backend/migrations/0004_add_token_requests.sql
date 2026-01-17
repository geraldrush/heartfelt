CREATE TABLE IF NOT EXISTS token_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'fulfilled', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_token_requests_recipient ON token_requests(recipient_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_token_requests_requester ON token_requests(requester_id, status, created_at);
