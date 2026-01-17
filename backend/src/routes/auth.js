import { Hono } from 'hono';

const auth = new Hono();

auth.post('/email-signup', async (c) => {
  return c.json({ message: 'Email signup endpoint' });
});

auth.post('/email-login', async (c) => {
  return c.json({ message: 'Email login endpoint' });
});

auth.post('/google', async (c) => {
  return c.json({ message: 'Google OAuth endpoint' });
});

export default auth;
