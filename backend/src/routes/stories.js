import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  createStorySchema,
  updateProfileSchema,
} from '../utils/validation.js';
import {
  generateId,
  getDb,
  getReferenceData,
  getUserById,
  updateUserProfile,
} from '../utils/db.js';

const stories = new Hono();

stories.get('/reference/data', async (c) => {
  const db = getDb(c);
  const data = await getReferenceData(db);
  return c.json(data);
});

stories.post('/upload-image', authMiddleware, async (c) => {
  const body = await c.req.parseBody();
  const file = body?.image;

  if (!file || typeof file === 'string') {
    return c.json({ error: 'Image file is required.' }, 400);
  }

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(file.type)) {
    return c.json({ error: 'Unsupported image type.' }, 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Image must be smaller than 5MB.' }, 400);
  }

  const extByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const imageId = generateId();
  const extension = extByType[file.type] || 'jpg';
  const imageKey = `images/${imageId}.${extension}`;

  await c.env.R2_BUCKET.put(imageKey, file, {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ original_url: imageKey, image_id: imageKey });
});

stories.post('/create-story', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createStorySchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');
  const storyId = generateId();

  await db
    .prepare('INSERT INTO stories (id, user_id, story_text, is_active) VALUES (?, ?, ?, 1)')
    .bind(storyId, userId, parsed.data.story_text)
    .run();

  for (const imageId of parsed.data.image_ids) {
    await db
      .prepare(
        'INSERT INTO story_images (id, story_id, original_url, blurred_url, processing_status) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(generateId(), storyId, imageId, imageId, 'pending')
      .run();
  }

  return c.json({ story_id: storyId, message: 'Story created successfully' });
});

stories.put('/update-profile', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');

  await updateUserProfile(db, userId, parsed.data);
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const { password_hash, ...safeUser } = user;

  return c.json({ user: safeUser });
});

stories.get('/feed', async (c) => {
  return c.json({ message: 'Story feed endpoint' });
});

export default stories;
