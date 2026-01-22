-- Add user preference columns for "Looking For" feature
ALTER TABLE users ADD COLUMN seeking_gender TEXT CHECK(seeking_gender IN ('male', 'female', 'non-binary', 'other', 'any'));
ALTER TABLE users ADD COLUMN seeking_age_min INTEGER;
ALTER TABLE users ADD COLUMN seeking_age_max INTEGER;
ALTER TABLE users ADD COLUMN seeking_races TEXT; -- JSON array stored as TEXT

-- Add indexes for filter performance
CREATE INDEX IF NOT EXISTS idx_users_seeking_gender ON users(seeking_gender);
CREATE INDEX IF NOT EXISTS idx_users_seeking_age ON users(seeking_age_min, seeking_age_max);