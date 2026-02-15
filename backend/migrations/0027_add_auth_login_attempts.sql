CREATE TABLE IF NOT EXISTS auth_login_attempts (
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email, ip_address)
);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked ON auth_login_attempts(locked_until);
