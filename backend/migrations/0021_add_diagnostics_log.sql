CREATE TABLE IF NOT EXISTS diagnostics_log (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_diagnostics_category_created
  ON diagnostics_log(category, created_at);
