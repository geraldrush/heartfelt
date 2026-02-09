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
  const user = await getUserById(db, userId);
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
    return c.json({ success: true, status: 'host' });
  }

  // Create join request
  const requestId = generateId();
  try {
    await db
      .prepare(
        `INSERT INTO live_room_join_requests (id, room_id, user_id, status)
         VALUES (?, ?, ?, 'pending')`
      )
      .bind(requestId, roomId, userId)
      .run();
  } catch {
    // Check if already has a request
    const existing = await db
      .prepare('SELECT status FROM live_room_join_requests WHERE room_id = ? AND user_id = ?')
      .bind(roomId, userId)
      .first();
    
    if (existing?.status === 'approved') {
      return c.json({ success: true, status: 'approved' });
    }
    return c.json({ success: true, status: existing?.status || 'pending' });
  }

  // Create notification for host
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, message, data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .bind(
      generateId(),
      room.host_id,
      'live_join_request',
      'Live Room Join Request',
      `${user.full_name} wants to join your live room`,
      JSON.stringify({ request_id: requestId, room_id: roomId, user_id: userId })
    )
    .run();

  return c.json({ success: true, status: 'pending', request_id: requestId });
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

live.post('/approve-join', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const requestId = body.request_id;

  if (!requestId) {
    return c.json({ error: 'Missing request_id.' }, 400);
  }

  const request = await db
    .prepare('SELECT r.*, lr.host_id FROM live_room_join_requests r JOIN live_rooms lr ON lr.id = r.room_id WHERE r.id = ?')
    .bind(requestId)
    .first();

  if (!request) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  if (request.host_id !== userId) {
    return c.json({ error: 'Unauthorized.' }, 403);
  }

  await db.batch([
    db.prepare('UPDATE live_room_join_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind('approved', requestId),
    db.prepare('INSERT INTO live_room_participants (id, room_id, user_id, role) VALUES (?, ?, ?, ?)')
      .bind(generateId(), request.room_id, request.user_id, 'viewer')
  ]);

  return c.json({ success: true });
});

live.post('/reject-join', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const requestId = body.request_id;

  if (!requestId) {
    return c.json({ error: 'Missing request_id.' }, 400);
  }

  const request = await db
    .prepare('SELECT r.*, lr.host_id FROM live_room_join_requests r JOIN live_rooms lr ON lr.id = r.room_id WHERE r.id = ?')
    .bind(requestId)
    .first();

  if (!request) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  if (request.host_id !== userId) {
    return c.json({ error: 'Unauthorized.' }, 403);
  }

  await db
    .prepare('UPDATE live_room_join_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind('rejected', requestId)
    .run();

  return c.json({ success: true });
});

live.get('/join-requests/:roomId', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const roomId = c.req.param('roomId');

  const room = await db
    .prepare('SELECT host_id FROM live_rooms WHERE id = ?')
    .bind(roomId)
    .first();

  if (!room || room.host_id !== userId) {
    return c.json({ error: 'Unauthorized.' }, 403);
  }

  const { results } = await db
    .prepare(
      `SELECT r.id, r.user_id, r.status, r.created_at, u.full_name, u.age, u.gender
       FROM live_room_join_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.room_id = ? AND r.status = 'pending'
       ORDER BY r.created_at ASC`
    )
    .bind(roomId)
    .all();

  return c.json({ requests: results || [] });
});

export default live;
