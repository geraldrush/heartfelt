ALTER TABLE story_images ADD COLUMN face_coordinates TEXT;
ALTER TABLE story_images ADD COLUMN faces_detected INTEGER DEFAULT 0;
