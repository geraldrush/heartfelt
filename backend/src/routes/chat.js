import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { verifyUserInConnection, getMessagesByConnection } from '../utils/db.js';

const chat = new Hono();

chat.get('/connect/:connectionId', async (c) => {
  const connectionId = c.req.param('connectionId');
  const upgradeHeader = c.req.header('Upgrade');
  
  // Validate WebSocket upgrade request
  if (upgradeHeader !== 'websocket') {
    console.log(`[Chat Route] Invalid upgrade header: ${upgradeHeader}`);
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }
  
  // Get Durable Object stub using connectionId as the unique identifier
  const id = c.env.CHAT_ROOM.idFromName(connectionId);
  const stub = c.env.CHAT_ROOM.get(id);
  
  // Forward the entire request to the Durable Object
  // The ChatRoom.fetch() method will handle authentication, authorization, and WebSocket upgrade
  return stub.fetch(c.req.raw);
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
    
    const messages = await getMessagesByConnection(c.env.DB, connectionId, limit, offset, before);
    
    return c.json({ messages });
  } catch (error) {
    console.error('[Chat] Get messages error:', error);
    return c.json({ error: 'Failed to load messages' }, 500);
  }
});

export default chat;