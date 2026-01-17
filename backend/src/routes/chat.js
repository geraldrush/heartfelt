import { Hono } from 'hono';

const chat = new Hono();

chat.get('/connect', async (c) => {
  return c.json({ message: 'Chat WebSocket endpoint' });
});

export default chat;
