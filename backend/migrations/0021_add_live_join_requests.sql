-- Add live room join requests table
CREATE TABLE IF NOT EXISTS live_room_join_requests (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT,
  FOREIGN KEY (room_id) REFERENCES live_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_join_requests_room ON live_room_join_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_live_join_requests_user ON live_room_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_live_join_requests_status ON live_room_join_requests(status);
