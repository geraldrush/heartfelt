-- Sample seed data for development
INSERT OR IGNORE INTO users (id, email, full_name, age, gender, location_city, location_province, religion, race, education, nationality, has_kids, num_kids, smoker, drinks_alcohol, created_at, token_balance) VALUES
  ('user1', 'sarah@example.com', 'Sarah Johnson', 28, 'female', 'Cape Town', 'Western Cape', 'Christian', 'White', 'Bachelor', 'South Africa', 0, 0, 0, 1, datetime('now'), 50),
  ('user2', 'mike@example.com', 'Michael Chen', 32, 'male', 'Johannesburg', 'Gauteng', 'Buddhist', 'Indian/Asian', 'Masters', 'South Africa', 0, 0, 0, 0, datetime('now'), 75),
  ('user3', 'priya@example.com', 'Priya Patel', 26, 'female', 'Durban', 'KwaZulu-Natal', 'Hindu', 'Indian/Asian', 'Bachelor', 'South Africa', 0, 0, 0, 1, datetime('now'), 30),
  ('user4', 'james@example.com', 'James Williams', 35, 'male', 'Cape Town', 'Western Cape', 'Christian', 'Black African', 'Diploma', 'South Africa', 1, 2, 0, 1, datetime('now'), 40),
  ('user5', 'zara@example.com', 'Zara Ndlovu', 29, 'female', 'Johannesburg', 'Gauteng', 'Christian', 'Black African', 'Honours', 'South Africa', 0, 0, 0, 0, datetime('now'), 60),
  ('user6', 'david@example.com', 'David Smith', 31, 'male', 'Port Elizabeth', 'Eastern Cape', 'Atheist', 'White', 'Masters', 'South Africa', 0, 0, 1, 1, datetime('now'), 45),
  ('user7', 'amara@example.com', 'Amara Okafor', 27, 'female', 'Durban', 'KwaZulu-Natal', 'Christian', 'Black African', 'Bachelor', 'Nigeria', 0, 0, 0, 1, datetime('now'), 55),
  ('user8', 'ryan@example.com', 'Ryan Thompson', 33, 'male', 'Cape Town', 'Western Cape', 'Agnostic', 'Coloured', 'Diploma', 'South Africa', 1, 1, 0, 1, datetime('now'), 35);

INSERT OR IGNORE INTO stories (id, user_id, story_text, created_at, is_active) VALUES
  ('story1', 'user1', 'Love hiking Table Mountain at sunrise! Looking for someone who shares my passion for adventure and early mornings. I believe the best conversations happen over coffee with a view. What''s your favorite way to start the day?', datetime('now', '-2 hours'), true),
  ('story2', 'user2', 'Tech entrepreneur by day, chef by night. I find peace in creating both digital solutions and culinary masterpieces. Seeking someone who appreciates good food and meaningful conversations about life''s possibilities.', datetime('now', '-4 hours'), true),
  ('story3', 'user3', 'Dance is my language of love! From classical Indian to contemporary, movement tells stories words cannot. Looking for someone who appreciates art, culture, and isn''t afraid to dance in the rain with me.', datetime('now', '-6 hours'), true),
  ('story4', 'user4', 'Single dad raising two amazing kids who keep me on my toes! I believe in building a legacy of love and laughter. Seeking a partner who understands that family comes first and love multiplies when shared.', datetime('now', '-8 hours'), true),
  ('story5', 'user5', 'Marketing maven with a heart for social impact. I spend weekends volunteering and weekdays building brands that matter. Looking for someone who believes business can be a force for good in the world.', datetime('now', '-10 hours'), true),
  ('story6', 'user6', 'Photographer capturing life''s beautiful moments. I see art in everyday scenes and believe every person has a story worth telling. Seeking someone who appreciates the beauty in simplicity and isn''t camera shy!', datetime('now', '-12 hours'), true),
  ('story7', 'user7', 'Doctor by profession, healer by heart. I believe in the power of compassion and human connection. Looking for someone who values kindness, has a curious mind, and isn''t afraid of deep conversations about life.', datetime('now', '-14 hours'), true),
  ('story8', 'user8', 'Musician and music teacher sharing the gift of melody. My son and I jam together every evening - he''s my biggest fan! Seeking someone who appreciates music''s power to heal and bring people together.', datetime('now', '-16 hours'), true);

INSERT OR IGNORE INTO story_images (id, story_id, original_url, blurred_url, processing_status, created_at) VALUES
  ('img1', 'story1', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&blur=20', 'completed', datetime('now', '-2 hours')),
  ('img2', 'story2', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&blur=20', 'completed', datetime('now', '-4 hours')),
  ('img3', 'story3', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&blur=20', 'completed', datetime('now', '-6 hours')),
  ('img4', 'story4', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&blur=20', 'completed', datetime('now', '-8 hours')),
  ('img5', 'story5', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&blur=20', 'completed', datetime('now', '-10 hours')),
  ('img6', 'story6', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&blur=20', 'completed', datetime('now', '-12 hours')),
  ('img7', 'story7', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&blur=20', 'completed', datetime('now', '-14 hours')),
  ('img8', 'story8', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&blur=20', 'completed', datetime('now', '-16 hours'));

-- Add some sample connection requests
INSERT OR IGNORE INTO connection_requests (id, sender_id, receiver_id, message, status, expires_at, created_at) VALUES
  ('req1', 'user2', 'user1', 'Hi Sarah! I love your hiking photos. Would love to explore Table Mountain together sometime!', 'pending', datetime('now', '+7 days'), datetime('now', '-1 hour')),
  ('req2', 'user4', 'user3', 'Your dance videos are amazing! I''d love to learn more about Indian classical dance.', 'accepted', datetime('now', '+7 days'), datetime('now', '-3 hours')),
  ('req3', 'user6', 'user5', 'Your work in social impact marketing really resonates with me. Would love to connect!', 'pending', datetime('now', '+7 days'), datetime('now', '-5 hours')),
  ('req4', 'user8', 'user7', 'As a fellow parent, I admire your dedication to both family and career. Coffee sometime?', 'accepted', datetime('now', '+7 days'), datetime('now', '-7 hours'));

-- Update token balances after connections
UPDATE users SET token_balance = token_balance - 5 WHERE id IN ('user2', 'user4', 'user6', 'user8');
UPDATE users SET token_balance = token_balance - 3 WHERE id IN ('user3', 'user7');
