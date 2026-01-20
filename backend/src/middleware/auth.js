import { jwtVerify } from 'jose';
import { getDb } from '../utils/db.js';

export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) {
    token = c.req.query('token') || null;
  }
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('userId', payload.sub);
    
    // Update user activity timestamp
    try {
      const db = getDb(c);
      await db.prepare('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(payload.sub)
        .run();
    } catch {
      // Ignore update errors to not break auth
    }
    
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
