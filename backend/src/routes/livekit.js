import { Hono } from 'hono';
import { AccessToken } from 'livekit-server-sdk';
import { authMiddleware } from '../middleware/auth.js';
import { getDb, verifyUserInConnection } from '../utils/db.js';

const livekit = new Hono();

const buildToken = ({ apiKey, apiSecret, identity, name, room, grants }) => {
  const token = new AccessToken(apiKey, apiSecret, { identity, name });
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    ...grants,
  });
  return token.toJwt();
};

livekit.post('/token', authMiddleware, async (c) => {
  const env = c.env;
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  const url = env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return c.json({ error: 'LiveKit not configured' }, 500);
  }

  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const roomId = body.room_id;
  const roomType = body.room_type || 'connection';
  const name = body.name || `user-${userId}`;

  if (!roomId) {
    return c.json({ error: 'Missing room_id' }, 400);
  }

  const db = getDb(c);

  if (roomType === 'connection') {
    const verification = await verifyUserInConnection(db, roomId, userId);
    if (!verification.valid) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
  }

  if (roomType === 'live') {
    const liveRoom = await db
      .prepare('SELECT host_id, status FROM live_rooms WHERE id = ?')
      .bind(roomId)
      .first();
    if (!liveRoom || liveRoom.status !== 'live') {
      return c.json({ error: 'Live room not available' }, 404);
    }
    const participant = await db
      .prepare('SELECT 1 FROM live_room_participants WHERE room_id = ? AND user_id = ? AND left_at IS NULL')
      .bind(roomId, userId)
      .first();
    if (!participant && liveRoom.host_id !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
  }

  const token = buildToken({
    apiKey,
    apiSecret,
    identity: userId,
    name,
    room: roomId,
    grants: {}
  });

  return c.json({ token, url });
});

export default livekit;
