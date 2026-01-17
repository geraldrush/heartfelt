import { Hono } from 'hono';

const tokens = new Hono();

tokens.get('/balance', async (c) => {
  return c.json({ message: 'Token balance endpoint' });
});

tokens.post('/transfer', async (c) => {
  return c.json({ message: 'Token transfer endpoint' });
});

tokens.get('/history', async (c) => {
  return c.json({ message: 'Token history endpoint' });
});

export default tokens;
