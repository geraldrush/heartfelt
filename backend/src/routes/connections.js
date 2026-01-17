import { Hono } from 'hono';

const connections = new Hono();

connections.post('/request', async (c) => {
  return c.json({ message: 'Connection request endpoint' });
});

connections.post('/accept', async (c) => {
  return c.json({ message: 'Accept connection endpoint' });
});

connections.post('/reject', async (c) => {
  return c.json({ message: 'Reject connection endpoint' });
});

export default connections;
