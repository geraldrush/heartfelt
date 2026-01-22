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
} from '../utils/db.js';
import {
  connectionActionSchema,
  connectionRequestSchema,
} from '../utils/validation.js';

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

  const result = await db.batch([
    db.prepare('UPDATE users SET token_balance = token_balance - ? WHERE id = ? AND token_balance >= ?')
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

  // Pre-batch balance check
  const balanceRow = await db.prepare('SELECT token_balance FROM users WHERE id = ?').bind(userId).first();
  if (!balanceRow || balanceRow.token_balance < 3) {
    return c.json({ error: 'Insufficient tokens.' }, 402);
  }

  try {
    // Verify connection was actually created
    const createdConnection = await db.prepare(
      'SELECT * FROM connections WHERE id = ?'
    ).bind(connectionId).first();
    
    if (createdConnection) {
      console.error('[Connections] Accept: Connection already exists, skipping batch operation');
      return c.json({ error: 'Connection already exists' }, 409);
    }

    const result = await db.batch([
      db.prepare('UPDATE users SET token_balance = token_balance - ? WHERE id = ?')
        .bind(cost, userId),
      db.prepare('UPDATE connection_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ? AND receiver_id = ?')
        .bind('accepted', request.id, 'pending', userId),
      db.prepare('INSERT INTO connections (id, user_id_1, user_id_2, status) VALUES (?, ?, ?, ?)')
        .bind(connectionId, request.sender_id, userId, 'active'),
      db.prepare('INSERT INTO token_transactions (id, user_id, amount, transaction_type, related_user_id, related_entity_id, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, (SELECT token_balance FROM users WHERE id = ?), ?, ?)')
        .bind(transactionId, userId, -cost, 'connection_request_accepted', request.sender_id, request.id, userId, 'Connection request accepted', new Date().toISOString())
    ]);

    // Verify all operations succeeded
    const finalConnection = await db.prepare(
      'SELECT * FROM connections WHERE id = ?'
    ).bind(connectionId).first();
    
    const updatedRequest = await db.prepare(
      'SELECT status FROM connection_requests WHERE id = ?'
    ).bind(request.id).first();
    
    if (!finalConnection || updatedRequest?.status !== 'accepted') {
      console.error('[Connections] Accept: Batch operation failed - connection or request status not updated');
      return c.json({ error: 'Failed to create connection' }, 500);
    }
    
    console.log(`[Connections] Accept: Connection created successfully: ${connectionId}`);
    console.log(`[Connections] Accept: Connection details:`, {
      id: finalConnection.id,
      user_id_1: finalConnection.user_id_1,
      user_id_2: finalConnection.user_id_2,
      status: finalConnection.status
    });

    const updatedUser = await db.prepare('SELECT token_balance FROM users WHERE id = ?').bind(userId).first();
    
    if (!updatedUser || updatedUser.token_balance < 0) {
      console.log('Accept: Insufficient tokens:', updatedUser?.token_balance);
      return c.json({ error: 'Insufficient tokens.' }, 402);
    }

    return c.json({
      success: true,
      connection_id: connectionId,
      new_balance: updatedUser.token_balance,
    });
  } catch (error) {
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
