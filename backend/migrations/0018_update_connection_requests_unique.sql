-- Allow re-requesting after cancel/reject by making uniqueness apply only to pending requests
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS connection_requests_new (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')),
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  responded_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO connection_requests_new (
  id, sender_id, receiver_id, status, message, created_at, expires_at, responded_at, updated_at
)
SELECT
  id, sender_id, receiver_id, status, message, created_at, expires_at, responded_at, CURRENT_TIMESTAMP
FROM connection_requests;

DROP TABLE connection_requests;
ALTER TABLE connection_requests_new RENAME TO connection_requests;

CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver ON connection_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_sender ON connection_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_connection_requests_expires ON connection_requests(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_requests_pending_unique
  ON connection_requests(sender_id, receiver_id)
  WHERE status = 'pending';

PRAGMA foreign_keys=on;
