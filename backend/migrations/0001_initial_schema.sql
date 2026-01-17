CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT CHECK(gender IN ('male', 'female', 'non-binary', 'other')),
  nationality TEXT,
  religion TEXT CHECK(religion IN ('Christian', 'Muslim', 'Hindu', 'Jewish', 'Buddhist', 'Atheist', 'Agnostic', 'Other', 'Prefer not to say')),
  race TEXT CHECK(race IN ('Black African', 'White', 'Coloured', 'Indian/Asian', 'Other', 'Prefer not to say')),
  education TEXT CHECK(education IN ('High School', 'Diploma', 'Bachelor', 'Honours', 'Masters', 'PhD', 'Other')),
  has_kids BOOLEAN NOT NULL DEFAULT 0,
  num_kids INTEGER DEFAULT 0,
  smoker BOOLEAN NOT NULL DEFAULT 0,
  drinks_alcohol BOOLEAN NOT NULL DEFAULT 0,
  location_city TEXT,
  location_province TEXT,
  location_lat REAL,
  location_lng REAL,
  token_balance INTEGER DEFAULT 50,
  profile_complete BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_location ON users(location_city, location_province);
CREATE INDEX idx_users_age ON users(age);
CREATE INDEX idx_users_gender ON users(gender);

CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  story_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_active ON stories(is_active);

CREATE TABLE story_images (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  blurred_url TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);
CREATE INDEX idx_story_images_story ON story_images(story_id);

CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  user_id_1 TEXT NOT NULL,
  user_id_2 TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'blocked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id_1, user_id_2)
);
CREATE INDEX idx_connections_user1 ON connections(user_id_1);
CREATE INDEX idx_connections_user2 ON connections(user_id_2);

CREATE TABLE connection_requests (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')),
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  responded_at DATETIME,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX idx_connection_requests_receiver ON connection_requests(receiver_id, status);
CREATE INDEX idx_connection_requests_sender ON connection_requests(sender_id, status);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_connection ON messages(connection_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

CREATE TABLE token_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('signup_bonus', 'purchase', 'connection_request_sent', 'connection_request_accepted', 'transfer_sent', 'transfer_received', 'refund')),
  related_user_id TEXT,
  related_entity_id TEXT,
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_token_transactions_user ON token_transactions(user_id, created_at);

CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tokens_active ON tokens(is_active);

CREATE TABLE religions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_religions_active ON religions(is_active);

CREATE TABLE races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_races_active ON races(is_active);

CREATE TABLE education_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_education_levels_active ON education_levels(is_active);

CREATE TABLE cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  province TEXT NOT NULL,
  lat REAL,
  lng REAL
);
CREATE INDEX idx_cities_province ON cities(province);
