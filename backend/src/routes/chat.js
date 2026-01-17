import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  createTokenRequest,
  getDb,
  getPendingTokenRequests,
  updateTokenRequestStatus,
} from '../utils/db.js';
import { tokenRequestSchema } from '../utils/validation.js';

const chat = new Hono();

chat.get('/token-requests', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const requests = await getPendingTokenRequests(db, userId);
  return c.json({ requests });
});

chat.post('/token-requests', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const requesterId = c.get('userId');
  if (parsed.data.recipient_id === requesterId) {
    return c.json({ error: 'Cannot request tokens from yourself.' }, 400);
  }

  const db = getDb(c);
  await createTokenRequest(db, {
    requester_id: requesterId,
    recipient_id: parsed.data.recipient_id,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
  });

  return c.json({ success: true });
});

chat.post('/token-requests/:id/fulfill', authMiddleware, async (c) => {
  const requestId = c.req.param('id');
  const db = getDb(c);
  await updateTokenRequestStatus(db, requestId, 'fulfilled');
  return c.json({ success: true });
});

chat.get('/connect', async (c) => {
  return c.json({ message: 'Chat WebSocket endpoint' });
});

export default chat;
