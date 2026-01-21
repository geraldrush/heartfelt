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
    const timestamp = new Date().toISOString();
    console.log(`[Auth] ${timestamp} JWT verification failed: ${error.code || error.message}`);
    
    if (error.code === 'ERR_JWT_EXPIRED') {
      return c.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401);
    }
    if (error.code === 'ERR_JWS_INVALID') {
      return c.json({ error: 'Invalid token signature', code: 'INVALID_SIGNATURE' }, 401);
    }
    if (error.code === 'ERR_JWT_MALFORMED') {
      return c.json({ error: 'Malformed token', code: 'MALFORMED_TOKEN' }, 401);
    }
    return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);
  }
}
