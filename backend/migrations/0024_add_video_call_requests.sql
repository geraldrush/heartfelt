CREATE TABLE IF NOT EXISTS video_call_requests (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  caller_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'ended', 'expired')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_video_call_requests_conn
  ON video_call_requests(connection_id, created_at);
CREATE INDEX IF NOT EXISTS idx_video_call_requests_recipient
  ON video_call_requests(recipient_id, status, created_at);
