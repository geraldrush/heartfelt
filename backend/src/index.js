import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import storyRoutes from './routes/stories.js';
import connectionRoutes from './routes/connections.js';
import tokenRoutes from './routes/tokens.js';
import chatRoutes from './routes/chat.js';
import imagesRoutes from './routes/images.js';
import paymentRoutes from './routes/payments.js';
import { getAllowedOrigins, isOriginAllowed, isRefererAllowed } from './utils/cors.js';

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: (origin, c) => {
      const allowedOrigins = getAllowedOrigins(c.env);
      if (!origin) {
        console.log('[CORS] No origin header, allowing request');
        return allowedOrigins;
      }
      if (isOriginAllowed(origin, c.env)) {
        console.log(`[CORS] Origin allowed: ${origin}`);
        return origin;
      }
      console.log(`[CORS] Origin rejected: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  })
);

// CSRF protection middleware
app.use('/*', async (c, next) => {
  const method = c.req.method;
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const path = c.req.path;
    
    // Skip CSRF for server-to-server endpoints
    const exemptPaths = ['/api/payments/notify', '/api/payments/refund'];
    if (exemptPaths.some(exemptPath => path.startsWith(exemptPath))) {
      await next();
      return;
    }
    
    const origin = c.req.header('Origin');
    const referer = c.req.header('Referer');
    
    const isValidOrigin = origin ? isOriginAllowed(origin, c.env) : false;
    const isValidReferer = referer ? isRefererAllowed(referer, c.env) : false;
    
    if (!isValidOrigin && !isValidReferer) {
      const allowedOrigins = getAllowedOrigins(c.env);
      console.log(`[CSRF] Invalid origin/referer: origin=${origin}, referer=${referer}, allowed: ${allowedOrigins.join(', ')}`);
      return c.json({ error: 'Invalid origin or referer' }, 403);
    }
  }
  await next();
});

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
