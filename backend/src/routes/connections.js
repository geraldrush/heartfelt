import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
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
} from '../utils/db.js';
import {
  connectionActionSchema,
  connectionRequestSchema,
} from '../utils/validation.js';

const connections = new Hono();

connections.post('/request', authMiddleware, async (c) => {
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

  const result = await db.batch([
    db.prepare('UPDATE users SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND token_balance >= ?')
      .bind(cost, senderId, cost),
    db.prepare('INSERT INTO connection_requests (id, sender_id, receiver_id, status, message, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(requestId, senderId, receiverId, 'pending', message, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    db.prepare('INSERT INTO token_transactions (id, user_id, amount, transaction_type, related_user_id, related_entity_id, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, (SELECT token_balance FROM users WHERE id = ?), ?, ?)')
      .bind(transactionId, senderId, -cost, 'connection_request_sent', receiverId, requestId, senderId, message, new Date().toISOString())
  ]);

  const updatedUser = await db.prepare('SELECT token_balance FROM users WHERE id = ?').bind(senderId).first();
  
  if (!updatedUser || updatedUser.token_balance < 0) {
    return c.json({ error: 'Insufficient tokens.' }, 402);
  }

  return c.json({
    success: true,
    request_id: requestId,
    new_balance: updatedUser.token_balance,
  });
});

connections.post('/accept', authMiddleware, async (c) => {
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

  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    await updateConnectionRequestStatus(db, request.id, 'expired');
    return c.json({ error: 'Request has expired.' }, 400);
  }

  const cost = 3;
  const connectionId = generateId();
  const transactionId = generateId();

  const result = await db
    .prepare(
      `WITH updated_receiver AS (
        UPDATE users
        SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND token_balance >= ?
        RETURNING id, token_balance
      ),
      updated_request AS (
        UPDATE connection_requests
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending' AND receiver_id = ?
          AND EXISTS (SELECT 1 FROM updated_receiver)
        RETURNING sender_id
      ),
      inserted_connection AS (
        INSERT INTO connections (id, user_id_1, user_id_2, status)
        SELECT ?, sender_id, ?, 'active'
        FROM updated_request
      ),
      inserted_tx AS (
        INSERT INTO token_transactions (
          id,
          user_id,
          amount,
          transaction_type,
          related_user_id,
          related_entity_id,
          balance_after,
          description,
          created_at
        )
        SELECT ?, id, ?, 'connection_request_accepted', sender_id, ?, token_balance, ?, ?
        FROM updated_receiver
      )
      SELECT token_balance AS receiver_balance FROM updated_receiver`
    )
    .bind(
      cost,
      userId,
      cost,
      request.id,
      userId,
      connectionId,
      userId,
      transactionId,
      -cost,
      request.id,
      'Connection request accepted',
      new Date().toISOString()
    )
    .first();

  if (!result) {
    return c.json({ error: 'Insufficient tokens.' }, 402);
  }

  return c.json({
    success: true,
    connection_id: connectionId,
    new_balance: result.receiver_balance,
  });
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

  await db
    .prepare(
      `WITH updated_request AS (
        UPDATE connection_requests
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending' AND receiver_id = ?
        RETURNING sender_id
      ),
      updated_sender AS (
        UPDATE users
        SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT sender_id FROM updated_request)
        RETURNING id, token_balance
      ),
      inserted_tx AS (
        INSERT INTO token_transactions (
          id,
          user_id,
          amount,
          transaction_type,
          related_user_id,
          related_entity_id,
          balance_after,
          description,
          created_at
        )
        SELECT ?, id, ?, 'refund', ?, ?, token_balance, ?, ?
        FROM updated_sender
      )
      SELECT 1 FROM updated_request`
    )
    .bind(
      request.id,
      userId,
      refund,
      transactionId,
      refund,
      userId,
      request.id,
      'Connection request rejected',
      new Date().toISOString()
    )
    .first();

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

  const result = await db
    .prepare(
      `WITH updated_request AS (
        UPDATE connection_requests
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending' AND sender_id = ?
        RETURNING sender_id
      ),
      updated_sender AS (
        UPDATE users
        SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT sender_id FROM updated_request)
        RETURNING id, token_balance
      ),
      inserted_tx AS (
        INSERT INTO token_transactions (
          id,
          user_id,
          amount,
          transaction_type,
          related_user_id,
          related_entity_id,
          balance_after,
          description,
          created_at
        )
        SELECT ?, id, ?, 'refund', NULL, ?, token_balance, ?, ?
        FROM updated_sender
      )
      SELECT token_balance AS sender_balance FROM updated_sender`
    )
    .bind(
      request.id,
      userId,
      refund,
      transactionId,
      refund,
      request.id,
      'Connection request cancelled',
      new Date().toISOString()
    )
    .first();

  if (!result) {
    return c.json({ error: 'Unable to cancel request.' }, 400);
  }

  return c.json({ success: true, new_balance: result.sender_balance });
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
  return c.json({ connections: list });
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
