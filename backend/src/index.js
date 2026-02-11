import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import storyRoutes from './routes/stories.js';
import connectionRoutes from './routes/connections.js';
import tokenRoutes from './routes/tokens.js';
import chatRoutes from './routes/chat.js';
import imagesRoutes from './routes/images.js';
import paymentRoutes from './routes/payments.js';
import notificationRoutes from './routes/notifications.js';
import liveRoutes from './routes/live.js';
import socialRoutes from './routes/social.js';
import livekitRoutes from './routes/livekit.js';
import { getAllowedOrigins, isOriginAllowed, isRefererAllowed } from './utils/cors.js';

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: (origin, c) => {
      // Skip CORS for WebSocket upgrade requests
      if (c.req.header('Upgrade') === 'websocket') {
        return origin || '*';
      }
      
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
  const upgradeHeader = c.req.header('Upgrade');
  
  // Skip CSRF for WebSocket upgrade requests
  if (upgradeHeader === 'websocket') {
    await next();
    return;
  }
  
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

app.get('/health', (c) => {
  const requiredVars = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'CORS_ORIGIN'];
  const missing = requiredVars.filter(key => !c.env[key]);
  
  return c.json({
    status: missing.length === 0 ? 'ok' : 'warning',
    timestamp: new Date().toISOString(),
    environment: {
      configured: requiredVars.length - missing.length,
      missing: missing.length > 0 ? missing : undefined
    }
  });
});

app.route('/api/auth', authRoutes);
app.route('/api/stories', storyRoutes);
app.route('/api/images', imagesRoutes);
app.route('/api/connections', connectionRoutes);
app.route('/api/tokens', tokenRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/live', liveRoutes);
app.route('/api/social', socialRoutes);
app.route('/api/livekit', livekitRoutes);

export default app;

export { ChatRoom } from './durable-objects/ChatRoom.js';
