import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { verifyUserInConnection, getMessagesByConnection, createTokenRequest, getPendingTokenRequests, generateId, getConnectionById } from '../utils/db.js';
import { createNotification } from './notifications.js';

const chat = new Hono();

const broadcastCallStatus = async (env, connectionId, payload) => {
  if (!env?.CHAT_ROOM || !connectionId) {
    return;
  }
  try {
    const id = env.CHAT_ROOM.idFromName(connectionId);
    const stub = env.CHAT_ROOM.get(id);
    await stub.fetch(`https://chat-room/call-status/${connectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[Chat] Failed to broadcast call status:', error?.message || error);
  }
};

chat.get('/connect/:connectionId', async (c) => {
  const connectionId = c.req.param('connectionId');
  const upgradeHeader = c.req.header('Upgrade');
  
  console.log(`[Chat Route] WebSocket connection request for: ${connectionId}`);
  console.log(`[Chat Route] Upgrade header: ${upgradeHeader}`);
  console.log(`[Chat Route] Origin: ${c.req.header('Origin')}`);
  
  // Validate WebSocket upgrade request
  if (upgradeHeader !== 'websocket') {
    console.log(`[Chat Route] Invalid upgrade header: ${upgradeHeader}`);
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }
  
  try {
    // Get Durable Object stub using connectionId as the unique identifier
    const id = c.env.CHAT_ROOM.idFromName(connectionId);
    const stub = c.env.CHAT_ROOM.get(id);
    
    console.log(`[Chat Route] Forwarding to Durable Object: ${connectionId}`);
    
    // Forward the entire request to the Durable Object
    // The ChatRoom.fetch() method will handle authentication, authorization, and WebSocket upgrade
    return stub.fetch(c.req.raw);
  } catch (error) {
    console.error(`[Chat Route] Error forwarding to Durable Object:`, error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

chat.get('/connection-status/:connectionId', authMiddleware, async (c) => {
  const connectionId = c.req.param('connectionId');
  const userId = c.get('userId');
  const timestamp = new Date().toISOString();
  
  console.log(`[Chat Status] ${timestamp} Checking connection ${connectionId} for user ${userId}`);
  
  try {
    // Use enhanced verification
    const verificationResult = await verifyUserInConnection(c.env.DB, connectionId, userId);
    
    let connectionDetails = null;
    
    // Only fetch connection details if user is authorized
    if (verificationResult.valid) {
      connectionDetails = await c.env.DB.prepare(`
        SELECT 
          c.id,
          c.user_id_1,
          c.user_id_2,
          c.status,
          c.created_at,
          u1.full_name as user1_name,
          u2.full_name as user2_name,
          (SELECT COUNT(*) FROM messages WHERE connection_id = c.id) as message_count
        FROM connections c
        LEFT JOIN users u1 ON c.user_id_1 = u1.id
        LEFT JOIN users u2 ON c.user_id_2 = u2.id
        WHERE c.id = ?
      `).bind(connectionId).first();
    }
    
    return c.json({
      authorized: verificationResult.valid,
      reason: verificationResult.reason || 'OK',
      message: verificationResult.message || 'Connection valid',
      connectionExists: verificationResult.valid && !!connectionDetails,
      connectionDetails,
      userId,
      timestamp
    });
  } catch (error) {
    console.error(`[Chat Status] ${timestamp} Error:`, error);
    return c.json({
      authorized: false,
      reason: 'ERROR',
      message: error.message,
      userId,
      timestamp
    }, 500);
  }
});

chat.get('/messages/:connectionId', authMiddleware, async (c) => {
  const connectionId = c.req.param('connectionId');
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit')) || 50;
  const offset = parseInt(c.req.query('offset')) || 0;
  const before = c.req.query('before');
  
  try {
    const verificationResult = await verifyUserInConnection(c.env.DB, connectionId, userId);
    
    if (!verificationResult.valid) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const existingConnection = await getConnectionById(c.env.DB, connectionId);
    const messages = existingConnection
      ? await getMessagesByConnection(c.env.DB, connectionId, limit, offset, before)
      : [];
    
    return c.json({ messages });
  } catch (error) {
    console.error('[Chat] Get messages error:', error);
    return c.json({ error: 'Failed to load messages' }, 500);
  }
});

chat.get('/token-requests', authMiddleware, async (c) => {
  const userId = c.get('userId');
  
  try {
    const requests = await getPendingTokenRequests(c.env.DB, userId);
    return c.json({ requests });
  } catch (error) {
    console.error('[Chat] Get token requests error:', error);
    return c.json({ error: 'Failed to load token requests' }, 500);
  }
});

chat.post('/token-requests', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.recipient_id || !body.amount) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  
  try {
    await createTokenRequest(c.env.DB, {
      requester_id: userId,
      recipient_id: body.recipient_id,
      amount: body.amount,
      reason: body.reason
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('[Chat] Create token request error:', error);
    return c.json({ error: 'Failed to create token request' }, 500);
  }
});

chat.post('/video-call-request', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  
  if (!body || !body.connection_id || !body.recipient_id) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  
  const db = c.env.DB;
  
  try {
    const user = await db.prepare('SELECT token_balance, full_name FROM users WHERE id = ?').bind(userId).first();
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const recentRequest = await db
      .prepare(
        `SELECT id FROM video_call_requests
         WHERE connection_id = ?
           AND status = 'pending'
           AND created_at >= datetime('now', '-2 minutes')
         LIMIT 1`
      )
      .bind(body.connection_id)
      .first();

    if (recentRequest) {
      return c.json({ error: 'Call request already pending.' }, 409);
    }

    const requestId = generateId();
    await db
      .prepare(
        `INSERT INTO video_call_requests (id, connection_id, caller_id, recipient_id, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .bind(requestId, body.connection_id, userId, body.recipient_id)
      .run();

    const existing = await db
      .prepare(
        `SELECT id FROM notifications
         WHERE user_id = ?
           AND read_at IS NULL
           AND json_extract(data, '$.notification_type') = 'video_call_request'
           AND json_extract(data, '$.connection_id') = ?
           AND created_at >= datetime('now', '-2 minutes')
         LIMIT 1`
      )
      .bind(body.recipient_id, body.connection_id)
      .first();

    if (!existing) {
    try {
      await createNotification(
        db,
        {
          user_id: body.recipient_id,
          type: 'system',
          title: 'Incoming video call',
          message: `${user.full_name} wants to start a video call`,
          data: { request_id: requestId, connection_id: body.connection_id, sender_id: userId, notification_type: 'video_call_request' }
        },
        c.env
      );
    } catch (err) {
      console.error('[Chat] Failed to create video call notification:', err);
    }
    }

    await broadcastCallStatus(c.env, body.connection_id, {
      status: 'ringing',
      request_id: requestId,
      from_user_id: userId,
      to_user_id: body.recipient_id,
    });
    
    return c.json({ 
      success: true, 
      request_id: requestId,
      new_balance: user.token_balance 
    });
  } catch (error) {
    console.error('[Chat] Video call request error:', error);
    return c.json({ error: 'Failed to create video call request' }, 500);
  }
});

chat.post('/video-call-response', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const requestId = body?.request_id;
  const response = body?.response;

  if (!requestId || !['accepted', 'declined', 'expired'].includes(response)) {
    return c.json({ error: 'Invalid request.' }, 400);
  }

  const db = c.env.DB;
  const existing = await db
    .prepare(
      `SELECT id, connection_id, caller_id, recipient_id FROM video_call_requests
       WHERE id = ? AND recipient_id = ? AND status = 'pending'`
    )
    .bind(requestId, userId)
    .first();

  if (!existing) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  await db
    .prepare(
      `UPDATE video_call_requests
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(response, requestId)
    .run();

  await broadcastCallStatus(c.env, existing.connection_id, {
    status: response,
    request_id: requestId,
    from_user_id: userId,
    to_user_id: existing.caller_id,
  });

  return c.json({ success: true });
});

chat.post('/video-call-ended', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const requestId = body?.request_id;
  const requestedStatus = body?.status === 'expired' ? 'expired' : 'ended';

  if (!requestId) {
    return c.json({ error: 'Invalid request.' }, 400);
  }

  const db = c.env.DB;
  const existing = await db
    .prepare(
      `SELECT id FROM video_call_requests
       WHERE id = ? AND (caller_id = ? OR recipient_id = ?) AND status IN ('pending', 'accepted')`
    )
    .bind(requestId, userId, userId)
    .first();

  if (!existing) {
    return c.json({ error: 'Request not found.' }, 404);
  }

  const currentStatusRow = await db
    .prepare(
      `SELECT status, connection_id, caller_id, recipient_id FROM video_call_requests
       WHERE id = ?`
    )
    .bind(requestId)
    .first();

  const nextStatus = requestedStatus === 'expired' && currentStatusRow?.status === 'pending'
    ? 'expired'
    : 'ended';

  await db
    .prepare(
      `UPDATE video_call_requests
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(nextStatus, requestId)
    .run();

  await broadcastCallStatus(c.env, currentStatusRow?.connection_id, {
    status: nextStatus,
    request_id: requestId,
    from_user_id: userId,
    to_user_id: currentStatusRow?.caller_id === userId ? currentStatusRow?.recipient_id : currentStatusRow?.caller_id,
  });

  return c.json({ success: true });
});

chat.get('/unread-counts', authMiddleware, async (c) => {
  const userId = c.get('userId');
  
  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        c.id as connection_id,
        COUNT(m.id) as unread_count
      FROM connections c
      LEFT JOIN messages m ON c.id = m.connection_id 
        AND m.sender_id != ? 
        AND m.status != 'read'
      WHERE (c.user_id_1 = ? OR c.user_id_2 = ?)
        AND c.status = 'accepted'
      GROUP BY c.id
    `).bind(userId, userId, userId).all();
    
    if (!result || !result.results) {
      return c.json({ unread_counts: {} });
    }
    
    const unreadCounts = {};
    if (result && Array.isArray(result.results)) {
      result.results.forEach(row => {
        unreadCounts[row.connection_id] = row.unread_count;
      });
    }
    
    return c.json({ unread_counts: unreadCounts });
  } catch (error) {
    console.error('[Chat] Get unread counts error:', error);
    return c.json({ error: 'Failed to load unread counts' }, 500);
  }
});

export default chat;
