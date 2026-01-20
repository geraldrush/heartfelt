-- First, deactivate duplicate stories, keeping only the most recent one per user
UPDATE stories 
SET is_active = 0 
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM stories 
    WHERE is_active = 1
  ) WHERE rn = 1
) AND is_active = 1;

-- Add unique constraint to ensure one story per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_user_unique ON stories(user_id) WHERE is_active = 1;