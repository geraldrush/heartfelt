import { jwtVerify } from 'jose';

export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('userId', payload.sub);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
