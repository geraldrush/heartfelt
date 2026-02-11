import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getDb, savePushSubscription, removePushSubscription } from '../utils/db.js';
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

// Mark notifications as read by type and optional connection_id
notifications.post('/mark-read-by', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const notificationType = body.notification_type;
  const connectionId = body.connection_id || null;

  if (!notificationType) {
    return c.json({ error: 'Missing notification_type' }, 400);
  }

  await db
    .prepare(
      `UPDATE notifications
       SET read_at = datetime('now')
       WHERE user_id = ?
         AND read_at IS NULL
         AND json_extract(data, '$.notification_type') = ?
         AND (json_extract(data, '$.connection_id') = ? OR ? IS NULL)`
    )
    .bind(userId, notificationType, connectionId, connectionId)
    .run();

  return c.json({ success: true });
});

// Mark all notifications as read
notifications.post('/mark-all-read', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');

  await db
    .prepare(
      `UPDATE notifications
       SET read_at = datetime('now')
       WHERE user_id = ?
         AND read_at IS NULL`
    )
    .bind(userId)
    .run();

  return c.json({ success: true });
});

// Get VAPID public key for push subscription
notifications.get('/push/public-key', authMiddleware, async (c) => {
  return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY || null });
});

// Save push subscription
notifications.post('/push/subscribe', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  if (!body || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'Invalid subscription' }, 400);
  }
  const userAgent = c.req.header('User-Agent') || null;
  await savePushSubscription(db, userId, body, userAgent);
  return c.json({ success: true });
});

// Remove push subscription
notifications.post('/push/unsubscribe', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (!endpoint) {
    return c.json({ error: 'Missing endpoint' }, 400);
  }
  await removePushSubscription(db, userId, endpoint);
  return c.json({ success: true });
});

export { createNotification };

export default notifications;
