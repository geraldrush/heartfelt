import { jwtVerify } from 'jose';

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
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
