import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getDb } from '../utils/db.js';
import { createNotification } from '../utils/notifications.js';

const notifications = new Hono();

// Get user notifications
notifications.get('/', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const userId = c.get('userId');
    const limit = Math.min(Number(c.req.query('limit') || 50), 100);
    const offset = Math.max(Number(c.req.query('offset') || 0), 0);
    
    const { results } = await db
      .prepare(`
        SELECT id, type, title, message, data, read_at, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all();
    
    return c.json({ notifications: results || [] });
  } catch (error) {
    console.error('[Notifications] Get error:', error);
    return c.json({ notifications: [] });
  }
});

// Mark notification as read
notifications.post('/:id/read', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const notificationId = c.req.param('id');
  
  await db
    .prepare('UPDATE notifications SET read_at = datetime("now") WHERE id = ? AND user_id = ?')
    .bind(notificationId, userId)
    .run();
  
  return c.json({ message: 'Notification marked as read.' });
});

// Get unread count
notifications.get('/unread-count', authMiddleware, async (c) => {
  try {
    const db = getDb(c);
    const userId = c.get('userId');
    
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL')
      .bind(userId)
      .first();
    
    return c.json({ count: result?.count || 0 });
  } catch (error) {
    console.error('[Notifications] Unread count error:', error);
    return c.json({ count: 0 });
  }
});

export { createNotification };

export default notifications;
