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
  const originalFile = body?.image_original;
  const blurredFile = body?.image_blurred;

  if (
    !originalFile ||
    !blurredFile ||
    typeof originalFile === 'string' ||
    typeof blurredFile === 'string'
  ) {
    return c.json({ error: 'Original and blurred image files are required.' }, 400);
  }

  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(originalFile.type) || !allowedTypes.has(blurredFile.type)) {
    return c.json({ error: 'Unsupported image type.' }, 400);
  }

  if (originalFile.size > 5 * 1024 * 1024 || blurredFile.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Image must be smaller than 5MB.' }, 400);
  }

  const extByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const imageId = generateId();
  const extension = extByType[originalFile.type] || 'jpg';
  const imageFile = `${imageId}.${extension}`;
  const originalKey = `private/images/${imageFile}`;
  const blurredKey = `public/images/${imageFile}`;
  const userId = c.get('userId');
  const metadata = {
    uploadedAt: Date.now().toString(),
    userId,
  };

  await c.env.R2_BUCKET.put(originalKey, originalFile, {
    httpMetadata: { contentType: originalFile.type },
    customMetadata: metadata,
  });

  await c.env.R2_BUCKET.put(blurredKey, blurredFile, {
    httpMetadata: { contentType: blurredFile.type },
    customMetadata: metadata,
  });

  return c.json({
    original_url: originalKey,
    blurred_url: blurredKey,
    image_id: imageFile,
  });
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
    const originalUrl = `private/images/${imageId}`;
    const blurredUrl = `public/images/${imageId}`;
    await db
      .prepare(
        'INSERT INTO story_images (id, story_id, original_url, blurred_url, processing_status) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(generateId(), storyId, originalUrl, blurredUrl, 'completed')
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

stories.get('/:storyId/images', async (c) => {
  const storyId = c.req.param('storyId');
  const db = getDb(c);
  const { results } = await db
    .prepare(
      'SELECT id, blurred_url, processing_status, created_at FROM story_images WHERE story_id = ? AND processing_status = ?'
    )
    .bind(storyId, 'completed')
    .all();

  const images = await Promise.all(
    results.map(async (row) => {
      let url = row.blurred_url;
      if (typeof c.env.R2_BUCKET.createSignedUrl === 'function') {
        try {
          url = await c.env.R2_BUCKET.createSignedUrl(row.blurred_url, {
            expiresIn: 3600,
          });
        } catch (error) {
          url = row.blurred_url;
        }
      }
      return {
        id: row.id,
        blurred_url: url,
        processing_status: row.processing_status,
        created_at: row.created_at,
      };
    })
  );

  return c.json({ images });
});

export default stories;
