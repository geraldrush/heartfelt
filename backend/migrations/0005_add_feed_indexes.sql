CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(profile_complete);
CREATE INDEX IF NOT EXISTS idx_stories_active_created ON stories(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_location_coords ON users(location_lat, location_lng);
