import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { generateId, getDb, getUserById } from '../utils/db.js';

const live = new Hono();

live.get('/list', authMiddleware, async (c) => {
  const db = getDb(c);
  const { results } = await db
    .prepare(
      `SELECT
        lr.id,
        lr.title,
        lr.description,
        lr.status,
        lr.host_id,
        lr.created_at,
        u.full_name as host_name,
        u.image_url as host_image,
        (SELECT COUNT(*) FROM live_room_participants p WHERE p.room_id = lr.id AND p.left_at IS NULL) as viewer_count
      FROM live_rooms lr
      LEFT JOIN users u ON u.id = lr.host_id
      WHERE lr.status = 'live'
      ORDER BY lr.created_at DESC
      LIMIT 50`
    )
    .all();

  return c.json({ rooms: results || [] });
});

live.get('/:roomId', authMiddleware, async (c) => {
  const db = getDb(c);
  const roomId = c.req.param('roomId');
  const room = await db
    .prepare(
      `SELECT
        lr.id,
        lr.title,
        lr.description,
        lr.status,
        lr.host_id,
        lr.created_at,
        u.full_name as host_name,
        u.image_url as host_image,
        (SELECT COUNT(*) FROM live_room_participants p WHERE p.room_id = lr.id AND p.left_at IS NULL) as viewer_count
      FROM live_rooms lr
      LEFT JOIN users u ON u.id = lr.host_id
      WHERE lr.id = ?`
    )
    .bind(roomId)
    .first();

  if (!room) {
    return c.json({ error: 'Live room not found.' }, 404);
  }

  return c.json({ room });
});

live.post('/create', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();

  if (!title) {
    return c.json({ error: 'Title is required.' }, 400);
  }

  const roomId = generateId();
  const participantId = generateId();

  await db
    .prepare(
      `INSERT INTO live_rooms (id, host_id, title, description, status)
       VALUES (?, ?, ?, ?, 'live')`
    )
    .bind(roomId, userId, title, description || null)
    .run();

  await db
    .prepare(
      `INSERT INTO live_room_participants (id, room_id, user_id, role)
       VALUES (?, ?, ?, 'host')`
    )
    .bind(participantId, roomId, userId)
    .run();

  return c.json({
    room: {
      id: roomId,
      title,
      description,
      status: 'live',
      host_id: userId,
      host_name: user.full_name,
      host_image: user.image_url || null,
      viewer_count: 1,
    }
  });
});

live.post('/join', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const roomId = body.room_id;

  if (!roomId) {
    return c.json({ error: 'Missing room_id.' }, 400);
  }

  const room = await db
    .prepare('SELECT id, host_id, status FROM live_rooms WHERE id = ?')
    .bind(roomId)
    .first();

  if (!room || room.status !== 'live') {
    return c.json({ error: 'Live room not available.' }, 404);
  }

  if (room.host_id === userId) {
    return c.json({ success: true });
  }

  try {
    await db
      .prepare(
        `INSERT INTO live_room_participants (id, room_id, user_id, role)
         VALUES (?, ?, ?, 'viewer')`
      )
      .bind(generateId(), roomId, userId)
      .run();
  } catch {
    // Ignore unique constraint errors (already joined)
  }

  return c.json({ success: true });
});

live.post('/leave', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const roomId = body.room_id;

  if (!roomId) {
    return c.json({ error: 'Missing room_id.' }, 400);
  }

  await db
    .prepare(
      `UPDATE live_room_participants
       SET left_at = CURRENT_TIMESTAMP
       WHERE room_id = ? AND user_id = ? AND left_at IS NULL`
    )
    .bind(roomId, userId)
    .run();

  const room = await db
    .prepare('SELECT host_id FROM live_rooms WHERE id = ?')
    .bind(roomId)
    .first();

  if (room && room.host_id === userId) {
    await db
      .prepare(
        `UPDATE live_rooms
         SET status = 'ended', ended_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(roomId)
      .run();
  }

  return c.json({ success: true });
});

export default live;
