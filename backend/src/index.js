import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import storyRoutes from './routes/stories.js';
import connectionRoutes from './routes/connections.js';
import tokenRoutes from './routes/tokens.js';
import chatRoutes from './routes/chat.js';
import imagesRoutes from './routes/images.js';
import paymentRoutes from './routes/payments.js';

const app = new Hono();

const defaultOrigins = ['http://localhost:5173', 'https://heartfelt.pages.dev'];

app.use(
  '/*',
  cors({
    origin: (origin, c) => {
      const raw = c.env.CORS_ORIGIN || '';
      const allowed = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const list = allowed.length > 0 ? allowed : defaultOrigins;

      if (!origin) {
        return list;
      }

      return list.includes(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth', authRoutes);
app.route('/api/stories', storyRoutes);
app.route('/api/images', imagesRoutes);
app.route('/api/connections', connectionRoutes);
app.route('/api/tokens', tokenRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/payments', paymentRoutes);

export default app;

export { ChatRoom } from './durable-objects/ChatRoom.js';
