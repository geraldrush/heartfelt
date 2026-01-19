import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  createStorySchema,
  updateProfileSchema,
} from '../utils/validation.js';
import {
  generateId,
  buildDistanceQuery,
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
  // CSRF protection for file upload operations
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const raw = c.env.CORS_ORIGIN || '';
  const allowed = raw.split(',').map(value => value.trim()).filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'https://heartfelt.pages.dev'];
  const list = allowed.length > 0 ? allowed : defaultOrigins;
  
  if (origin && !list.includes(origin)) {
    return c.json({ error: 'Forbidden origin' }, 403);
  }
  
  if (referer && !list.some(allowedOrigin => referer.startsWith(allowedOrigin))) {
    return c.json({ error: 'Invalid referer' }, 403);
  }

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
  // CSRF protection for story creation
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const raw = c.env.CORS_ORIGIN || '';
  const allowed = raw.split(',').map(value => value.trim()).filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'https://heartfelt.pages.dev'];
  const list = allowed.length > 0 ? allowed : defaultOrigins;
  
  if (origin && !list.includes(origin)) {
    return c.json({ error: 'Forbidden origin' }, 403);
  }
  
  if (referer && !list.some(allowedOrigin => referer.startsWith(allowedOrigin))) {
    return c.json({ error: 'Invalid referer' }, 403);
  }

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
  // CSRF protection for profile updates
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const raw = c.env.CORS_ORIGIN || '';
  const allowed = raw.split(',').map(value => value.trim()).filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'https://heartfelt.pages.dev'];
  const list = allowed.length > 0 ? allowed : defaultOrigins;
  
  if (origin && !list.includes(origin)) {
    return c.json({ error: 'Forbidden origin' }, 403);
  }
  
  if (referer && !list.some(allowedOrigin => referer.startsWith(allowedOrigin))) {
    return c.json({ error: 'Invalid referer' }, 403);
  }

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

stories.get('/feed', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const limitRaw = Number(c.req.query('limit') || 20);
  const offsetRaw = Number(c.req.query('offset') || 0);
  const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 20, 50);
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  const maxDistanceRaw = c.req.query('max_distance_km');
  const maxDistance = Number.isFinite(Number(maxDistanceRaw))
    ? Number(maxDistanceRaw)
    : 100;

  const parseBool = (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  };

  const ageMin = Number(c.req.query('age_min'));
  const ageMax = Number(c.req.query('age_max'));
  const gender = c.req.query('gender');
  const religion = c.req.query('religion');
  const race = c.req.query('race');
  const education = c.req.query('education');
  const nationality = c.req.query('nationality');
  const hasKids = parseBool(c.req.query('has_kids'));
  const numKids = Number(c.req.query('num_kids'));
  const smoker = parseBool(c.req.query('smoker'));
  const drinksAlcohol = parseBool(c.req.query('drinks_alcohol'));

  const userLat = Number.isFinite(user.location_lat) ? user.location_lat : null;
  const userLng = Number.isFinite(user.location_lng) ? user.location_lng : null;
  const hasUserLocation = userLat !== null && userLng !== null;

  const distanceFormula = hasUserLocation
    ? buildDistanceQuery(userLat, userLng)
    : '999999';
  const distanceSelect = hasUserLocation
    ? `CASE WHEN users.location_lat IS NULL OR users.location_lng IS NULL THEN 999999 ELSE ${distanceFormula} END`
    : '999999';

  const conditions = [
    'stories.is_active = 1',
    'users.profile_complete = 1',
    'stories.user_id != ?',
    'c.id IS NULL',
  ];
  const params = [userId];

  if (Number.isFinite(ageMin)) {
    conditions.push('users.age >= ?');
    params.push(ageMin);
  }
  if (Number.isFinite(ageMax)) {
    conditions.push('users.age <= ?');
    params.push(ageMax);
  }
  if (gender) {
    conditions.push('users.gender = ?');
    params.push(gender);
  }
  if (religion) {
    conditions.push('users.religion = ?');
    params.push(religion);
  }
  if (race) {
    conditions.push('users.race = ?');
    params.push(race);
  }
  if (education) {
    conditions.push('users.education = ?');
    params.push(education);
  }
  if (nationality) {
    conditions.push('users.nationality = ?');
    params.push(nationality);
  }
  if (typeof hasKids === 'boolean') {
    conditions.push('users.has_kids = ?');
    params.push(hasKids ? 1 : 0);
  }
  if (Number.isFinite(numKids)) {
    conditions.push('users.num_kids = ?');
    params.push(numKids);
  }
  if (typeof smoker === 'boolean') {
    conditions.push('users.smoker = ?');
    params.push(smoker ? 1 : 0);
  }
  if (typeof drinksAlcohol === 'boolean') {
    conditions.push('users.drinks_alcohol = ?');
    params.push(drinksAlcohol ? 1 : 0);
  }
  if (hasUserLocation && Number.isFinite(maxDistance)) {
    conditions.push(
      `(users.location_lat IS NULL OR users.location_lng IS NULL OR ${distanceFormula} <= ?)`
    );
    params.push(maxDistance);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const baseJoins = `
    JOIN users ON users.id = stories.user_id
    LEFT JOIN connections c
      ON c.status = 'active'
      AND ((c.user_id_1 = stories.user_id AND c.user_id_2 = ?)
        OR (c.user_id_2 = stories.user_id AND c.user_id_1 = ?))
    LEFT JOIN connection_requests cr_sent
      ON cr_sent.sender_id = ? AND cr_sent.receiver_id = stories.user_id AND cr_sent.status = 'pending'
    LEFT JOIN connection_requests cr_received
      ON cr_received.sender_id = stories.user_id AND cr_received.receiver_id = ? AND cr_received.status = 'pending'
  `;

  const joinParams = [userId, userId, userId, userId];

  const countQuery = `
    SELECT COUNT(*) as total
    FROM stories
    ${baseJoins}
    ${whereClause}
  `;

  const countRow = await db
    .prepare(countQuery)
    .bind(...joinParams, ...params)
    .first();
  const total = countRow?.total ?? 0;

  const feedQuery = `
    SELECT
      stories.id AS story_id,
      stories.user_id,
      users.age,
      users.gender,
      users.nationality,
      users.religion,
      users.race,
      users.education,
      users.has_kids,
      users.num_kids,
      users.smoker,
      users.drinks_alcohol,
      users.location_city,
      users.location_province,
      ${distanceSelect} AS distance_km,
      CASE
        WHEN users.updated_at >= datetime('now', '-10 minutes') THEN 1
        ELSE 0
      END AS is_online,
      stories.story_text,
      stories.created_at,
      si.blurred_url AS blurred_image_url,
      cr_received.id AS request_id,
      CASE
        WHEN c.id IS NOT NULL THEN 'connected'
        WHEN cr_sent.id IS NOT NULL THEN 'pending_sent'
        WHEN cr_received.id IS NOT NULL THEN 'pending_received'
        ELSE 'none'
      END AS connection_status
    FROM stories
    ${baseJoins}
    LEFT JOIN story_images si
      ON si.id = (
        SELECT id
        FROM story_images
        WHERE story_id = stories.id AND processing_status = 'completed'
        ORDER BY created_at ASC
        LIMIT 1
      )
    ${whereClause}
    ORDER BY distance_km ASC, stories.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const { results } = await db
    .prepare(feedQuery)
    .bind(...joinParams, ...params, limit, offset)
    .all();

  const origin = new URL(c.req.url).origin;
  const stories = results.map((row) => {
    const hasImage = Boolean(row.blurred_image_url);
    const imageUrl = hasImage
      ? `${origin}/api/stories/${row.story_id}/blurred`
      : null;
    return {
      ...row,
      blurred_image_url: imageUrl,
    };
  });

  return c.json({
    stories,
    total,
    has_more: offset + stories.length < total,
  });
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

  const origin = new URL(c.req.url).origin;
  const images = results.map((row) => ({
    id: row.id,
    blurred_url: `${origin}/api/stories/${storyId}/blurred`,
    processing_status: row.processing_status,
    created_at: row.created_at,
  }));

  return c.json({ images });
});

stories.get('/:storyId/blurred', async (c) => {
  const storyId = c.req.param('storyId');
  const db = getDb(c);
  const image = await db
    .prepare(
      `SELECT blurred_url
       FROM story_images
       WHERE story_id = ? AND processing_status = 'completed'
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .bind(storyId)
    .first();

  if (!image || !image.blurred_url) {
    return c.json({ error: 'Image not found.' }, 404);
  }

  const stored = await c.env.R2_BUCKET.get(image.blurred_url);
  if (!stored) {
    return c.json({ error: 'Image unavailable.', image: image.blurred_url }, 404);
  }

  const headers = {
    'Content-Type': stored.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=300',
  };

  return c.body(stored.body, 200, headers);
});

export default stories;
