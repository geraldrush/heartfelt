import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  createTokenRequest,
  getMessagesByConnection,
  getDb,
  getUnreadCounts,
  getPendingTokenRequests,
  updateMultipleMessageStatus,
  updateTokenRequestStatus,
  verifyUserInConnection,
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

chat.get('/connect/:connectionId', authMiddleware, async (c) => {
  const connectionId = c.req.param('connectionId');
  const userId = c.get('userId');
  const db = getDb(c);

  const isAllowed = await verifyUserInConnection(db, connectionId, userId);
  if (!isAllowed) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.env.CHAT_ROOM.idFromName(connectionId);
  const stub = c.env.CHAT_ROOM.get(id);
  return stub.fetch(c.req.raw);
});

chat.get('/messages/:connectionId', authMiddleware, async (c) => {
  const connectionId = c.req.param('connectionId');
  const userId = c.get('userId');
  const db = getDb(c);

  const isAllowed = await verifyUserInConnection(db, connectionId, userId);
  if (!isAllowed) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const limitRaw = Number(c.req.query('limit') || 50);
  const offsetRaw = Number(c.req.query('offset') || 0);
  const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 100);
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
  const before = c.req.query('before') || c.req.query('before_timestamp') || null;

  const messages = await getMessagesByConnection(db, connectionId, limit, offset, before);
  return c.json({ messages, limit, offset });
});

chat.get('/unread-counts', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const counts = await getUnreadCounts(db, userId);
  return c.json({ counts });
});

chat.post('/messages/mark-delivered', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const ids = Array.isArray(body?.message_ids) ? body.message_ids : [];
  await updateMultipleMessageStatus(getDb(c), ids, 'delivered');
  return c.json({ success: true });
});

export default chat;
