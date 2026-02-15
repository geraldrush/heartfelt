import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

const dataExport = new Hono();

dataExport.get('/export', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;

  const [user, stories, connections, messages, transactions] = await Promise.all([
    db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first(),
    db.prepare('SELECT * FROM stories WHERE user_id = ?').bind(userId).all(),
    db.prepare('SELECT * FROM connections WHERE user_id_1 = ? OR user_id_2 = ?').bind(userId, userId).all(),
    db.prepare('SELECT * FROM messages WHERE sender_id = ?').bind(userId).all(),
    db.prepare('SELECT * FROM token_transactions WHERE user_id = ?').bind(userId).all()
  ]);

  const exportData = {
    user,
    stories: stories.results || [],
    connections: connections.results || [],
    messages: messages.results || [],
    transactions: transactions.results || [],
    exported_at: new Date().toISOString()
  };

  return c.json(exportData);
});

export default dataExport;
