import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { connectionRequestRateLimit } from '../middleware/rateLimit.js';
import {
  checkExistingConnection,
  expireOldRequests,
  generateId,
  getConnectionRequestById,
  getConnections,
  getDb,
  getReceivedConnectionRequests,
  getSentConnectionRequests,
  getUserById,
  updateConnectionRequestStatus,
  verifyUserInConnection,
} from '../utils/db.js';
import {
  connectionActionSchema,
  connectionRequestSchema,
} from '../utils/validation.js';
import { createNotification } from './notifications.js';

const connections = new Hono();

connections.post('/request', authMiddleware, connectionRequestRateLimit, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = connectionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const senderId = c.get('userId');
  const receiverId = parsed.data.receiver_id;

  if (senderId === receiverId) {
    return c.json({ error: 'Cannot request a connection with yourself.' }, 400);
  }

  const db = getDb(c);
  const sender = await getUserById(db, senderId);
  const receiver = await getUserById(db, receiverId);

  if (!sender || !receiver) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const exists = await checkExistingConnection(db, senderId, receiverId);
  if (exists) {
    return c.json({ error: 'Connection already exists or pending.' }, 409);
  }

  const cost = 5;
  const requestId = generateId();
  const transactionId = generateId();
  const message = parsed.data.message || 'Connection request sent';
  const timestamp = new Date().toISOString();

  const balanceUpdate = await db
    .prepare(
      'UPDATE users SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND token_balance >= ? RETURNING token_balance'
    )
    .bind(cost, senderId, cost)
    .first();

  if (!balanceUpdate || balanceUpdate.token_balance == null) {
    return c.json({ error: 'Insufficient tokens.' }, 402);
  }

  try {
    await db.batch([
      db.prepare('INSERT INTO connection_requests (id, sender_id, receiver_id, status, message, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(requestId, senderId, receiverId, 'pending', message, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      db.prepare('INSERT INTO token_transactions (id, user_id, amount, transaction_type, related_user_id, related_entity_id, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(transactionId, senderId, -cost, 'connection_request_sent', receiverId, requestId, balanceUpdate.token_balance, message, timestamp)
    ]);
  } catch (error) {
    await db
      .prepare('UPDATE users SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(cost, senderId)
      .run();
    if (error?.message?.includes('SQLITE_CONSTRAINT')) {
      return c.json({ error: 'Connection request already pending.' }, 409);
    }
    console.error('Connection request error:', error);
    return c.json({ error: 'Database error occurred.' }, 500);
  }

  // Create notification for receiver
  await createNotification(
    db,
    {
      user_id: receiverId,
      type: 'connection_request',
      title: 'New Connection Request',
      message: `${sender.full_name} sent you a connection request`,
      data: { request_id: requestId, sender_id: senderId, notification_type: 'connection_request' }
    },
    c.env
  );

  return c.json({
    success: true,
    request_id: requestId,
    new_balance: balanceUpdate.token_balance,
  });
});

connections.post('/accept', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = connectionActionSchema.safeParse(body);

  if (!parsed.success) {
    console.log('Accept validation error:', parsed.error.flatten());
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');
  const request = await getConnectionRequestById(db, parsed.data.request_id);

  if (!request) {
    console.log('Accept: Request not found:', parsed.data.request_id);
    return c.json({ error: 'Request not found.' }, 404);
  }

  if (request.receiver_id !== userId) {
    console.log('Accept: Unauthorized:', request.receiver_id, 'vs', userId);
    return c.json({ error: 'Unauthorized request action.' }, 401);
  }

  if (request.status !== 'pending') {
    console.log('Accept: Request not pending:', request.status);
    return c.json({ error: 'Request is no longer pending.' }, 400);
  }

  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    await updateConnectionRequestStatus(db, request.id, 'expired');
    console.log('Accept: Request expired:', request.expires_at);
    return c.json({ error: 'Request has expired.' }, 400);
  }

  const cost = 3;
  const connectionId = generateId();
  const transactionId = generateId();
  const existingConnection = await db
    .prepare(
      `SELECT 1 FROM connections
       WHERE status = 'active'
         AND ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?))
       LIMIT 1`
    )
    .bind(request.sender_id, userId, userId, request.sender_id)
    .first();

  if (existingConnection) {
    return c.json({ error: 'Connection already exists.' }, 409);
  }

  const balanceUpdate = await db
    .prepare(
      'UPDATE users SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND token_balance >= ? RETURNING token_balance'
    )
    .bind(cost, userId, cost)
    .first();

  if (!balanceUpdate || balanceUpdate.token_balance == null) {
    return c.json({ error: 'Insufficient tokens.' }, 402);
  }

  try {
    const acceptedRequest = await db
      .prepare(
        'UPDATE connection_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ? AND receiver_id = ? RETURNING id'
      )
      .bind('accepted', request.id, 'pending', userId)
      .first();

    if (!acceptedRequest) {
      await db
        .prepare('UPDATE users SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(cost, userId)
        .run();
      return c.json({ error: 'Request is no longer pending.' }, 400);
    }

    const [userId1, userId2] = request.sender_id < userId
      ? [request.sender_id, userId]
      : [userId, request.sender_id];

    await db
      .prepare('INSERT INTO connections (id, user_id_1, user_id_2, status) VALUES (?, ?, ?, ?)')
      .bind(connectionId, userId1, userId2, 'active')
      .run();

    await db
      .prepare('INSERT INTO token_transactions (id, user_id, amount, transaction_type, related_user_id, related_entity_id, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(transactionId, userId, -cost, 'connection_request_accepted', request.sender_id, request.id, balanceUpdate.token_balance, 'Connection request accepted', new Date().toISOString())
      .run();

    return c.json({
      success: true,
      connection_id: connectionId,
      new_balance: balanceUpdate.token_balance,
    });
  } catch (error) {
    await db
      .prepare('UPDATE users SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(cost, userId)
      .run();
    await db
      .prepare('UPDATE connection_requests SET status = ?, responded_at = NULL WHERE id = ? AND status = ?')
      .bind('pending', request.id, 'accepted')
      .run();
    if (error?.message?.includes('SQLITE_CONSTRAINT')) {
      return c.json({ error: 'Connection already exists.' }, 409);
    }
    console.error('Accept connection error:', error);
    return c.json({ error: 'Database error occurred.' }, 500);
  }
});

connections.post('/reject', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = connectionActionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');
  const request = await getConnectionRequestById(db, parsed.data.request_id);

  if (!request) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  if (request.receiver_id !== userId) {
    return c.json({ error: 'Unauthorized request action.' }, 401);
  }

  if (request.status !== 'pending') {
    return c.json({ error: 'Request is no longer pending.' }, 400);
  }

  const refund = 5;
  const transactionId = generateId();

  await db.batch([
    db.prepare('UPDATE connection_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ? AND receiver_id = ?')
      .bind('rejected', request.id, 'pending', userId),
    db.prepare('UPDATE users SET token_balance = token_balance + ? WHERE id = ?')
      .bind(refund, request.sender_id),
    db.prepare('INSERT INTO token_transactions (id, user_id, amount, transaction_type, related_user_id, related_entity_id, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, (SELECT token_balance FROM users WHERE id = ?), ?, ?)')
      .bind(transactionId, request.sender_id, refund, 'refund', userId, request.id, request.sender_id, 'Connection request rejected', new Date().toISOString())
  ]);

  return c.json({ success: true });
});

connections.post('/cancel', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = connectionActionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');
  const request = await getConnectionRequestById(db, parsed.data.request_id);

  if (!request) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  if (request.sender_id !== userId) {
    return c.json({ error: 'Unauthorized request action.' }, 401);
  }

  if (request.status !== 'pending') {
    return c.json({ error: 'Request is no longer pending.' }, 400);
  }

  const refund = 5;
  const transactionId = generateId();

  await db.batch([
    db.prepare('UPDATE connection_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ? AND sender_id = ?')
      .bind('rejected', request.id, 'pending', userId),
    db.prepare('UPDATE users SET token_balance = token_balance + ? WHERE id = ?')
      .bind(refund, userId),
    db.prepare('INSERT INTO token_transactions (id, user_id, amount, transaction_type, related_user_id, related_entity_id, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, (SELECT token_balance FROM users WHERE id = ?), ?, ?)')
      .bind(transactionId, userId, refund, 'refund', null, request.id, userId, 'Connection request cancelled', new Date().toISOString())
  ]);

  const updatedUser = await db.prepare('SELECT token_balance FROM users WHERE id = ?').bind(userId).first();

  return c.json({ success: true, new_balance: updatedUser.token_balance });
});

connections.get('/sent', authMiddleware, async (c) => {
  const db = getDb(c);
  await expireOldRequests(db);
  const userId = c.get('userId');
  const requests = await getSentConnectionRequests(db, userId);
  return c.json({ requests });
});

connections.get('/received', authMiddleware, async (c) => {
  const db = getDb(c);
  await expireOldRequests(db);
  const userId = c.get('userId');
  const requests = await getReceivedConnectionRequests(db, userId);
  return c.json({ requests });
});

connections.get('/list', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const list = await getConnections(db, userId);
  const origin = new URL(c.req.url).origin;
  const connections = list.map((item) => ({
    ...item,
    is_online: Boolean(item.is_online),
    image_url: item.story_id ? `${origin}/api/stories/${item.story_id}/image` : null,
  }));
  return c.json({ connections });
});

connections.get('/profile/:connectionId', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const connectionId = c.req.param('connectionId');

  const verification = await verifyUserInConnection(db, connectionId, userId);
  if (!verification.valid) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const profile = await db.prepare(
    `SELECT
      u.id,
      u.full_name,
      u.age,
      u.gender,
      u.nationality,
      u.religion,
      u.race,
      u.education,
      u.has_kids,
      u.num_kids,
      u.smoker,
      u.drinks_alcohol,
      u.location_city,
      u.location_province,
      s.id as story_id,
      s.story_text
    FROM connections c
    JOIN users u ON u.id = CASE
      WHEN c.user_id_1 = ? THEN c.user_id_2
      ELSE c.user_id_1
    END
    LEFT JOIN stories s ON s.user_id = u.id AND s.is_active = 1
    WHERE c.id = ? AND c.status = 'active'`
  ).bind(userId, connectionId).first();

  if (!profile) {
    return c.json({ error: 'Profile not found.' }, 404);
  }

  let imageUrl = null;
  if (profile.story_id) {
    const origin = new URL(c.req.url).origin;
    imageUrl = `${origin}/api/stories/${profile.story_id}/image`;
  }

  return c.json({
    profile: {
      ...profile,
      image_url: imageUrl,
    },
  });
});

connections.get('/counts', authMiddleware, async (c) => {
  const db = getDb(c);
  await expireOldRequests(db);
  const userId = c.get('userId');

  const sent = await db
    .prepare(
      "SELECT COUNT(*) as total FROM connection_requests WHERE sender_id = ? AND status = 'pending'"
    )
    .bind(userId)
    .first();
  const received = await db
    .prepare(
      "SELECT COUNT(*) as total FROM connection_requests WHERE receiver_id = ? AND status = 'pending'"
    )
    .bind(userId)
    .first();
  const totalConnections = await db
    .prepare(
      "SELECT COUNT(*) as total FROM connections WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'active'"
    )
    .bind(userId, userId)
    .first();

  return c.json({
    sent_requests: sent?.total ?? 0,
    received_requests: received?.total ?? 0,
    total_connections: totalConnections?.total ?? 0,
  });
});

export default connections;
