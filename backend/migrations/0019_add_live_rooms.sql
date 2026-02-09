CREATE TABLE IF NOT EXISTS live_rooms (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS live_room_participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_live_rooms_status_created
  ON live_rooms(status, created_at);

CREATE INDEX IF NOT EXISTS idx_live_room_participants_room
  ON live_room_participants(room_id);

CREATE INDEX IF NOT EXISTS idx_live_room_participants_user
  ON live_room_participants(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_room_participant_active
  ON live_room_participants(room_id, user_id)
  WHERE left_at IS NULL;
