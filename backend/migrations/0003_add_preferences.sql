-- Add user preference fields for onboarding and matching
ALTER TABLE users ADD COLUMN seeking_gender TEXT CHECK(seeking_gender IN ('male', 'female', 'non-binary', 'other', 'any'));
ALTER TABLE users ADD COLUMN seeking_age_min INTEGER;
ALTER TABLE users ADD COLUMN seeking_age_max INTEGER;
ALTER TABLE users ADD COLUMN seeking_races TEXT;
