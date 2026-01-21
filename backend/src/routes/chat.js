import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { verifyUserInConnection } from '../utils/db.js';

const chat = new Hono();

chat.get('/connection-status/:connectionId', authMiddleware, async (c) => {
  const connectionId = c.req.param('connectionId');
  const userId = c.get('userId');
  
  try {
    const authorized = await verifyUserInConnection(c.env.DB, connectionId, userId);
    
    // Check if connection exists in database
    const connectionExists = await c.env.DB.prepare(
      'SELECT id FROM connections WHERE id = ?'
    ).bind(connectionId).first();
    
    return c.json({
      authorized,
      connectionExists: !!connectionExists,
      connectionStatus: connectionExists ? 'active' : 'not_found',
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat] Connection status check failed:', error);
    return c.json({
      authorized: false,
      connectionExists: false,
      connectionStatus: 'error',
      userId,
      timestamp: new Date().toISOString(),
      error: error.message
    }, 500);
  }
});

export default chat;