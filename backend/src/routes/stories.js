import { Hono } from 'hono';

const stories = new Hono();

stories.post('/upload-image', async (c) => {
  return c.json({ message: 'Image upload endpoint' });
});

stories.get('/feed', async (c) => {
  return c.json({ message: 'Story feed endpoint' });
});

export default stories;
