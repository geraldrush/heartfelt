import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { getSecurityEvents } from '../utils/security.js';

const admin = new Hono();

admin.get('/security/events', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;

  // Check if user is admin (you can add admin flag to users table)
  const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first();
  if (!user?.is_admin) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const filters = {
    event_type: c.req.query('event_type'),
    since: c.req.query('since'),
    limit: parseInt(c.req.query('limit')) || 100
  };

  const events = await getSecurityEvents(db, filters);
  return c.json({ events });
});

admin.get('/security/stats', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;

  const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first();
  if (!user?.is_admin) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const stats = await db.prepare(`
    SELECT 
      event_type,
      COUNT(*) as count,
      MAX(created_at) as last_occurrence
    FROM security_events
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY event_type
  `).all();

  return c.json({ stats: stats.results || [] });
});

export default admin;
