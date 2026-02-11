import { Hono } from 'hono';
import { AccessToken } from 'livekit-server-sdk';
import { authMiddleware } from '../middleware/auth.js';
import { getDb, verifyUserInConnection } from '../utils/db.js';
import { logDiagnostics } from '../utils/diagnostics.js';

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
    console.error('[LiveKit] Missing configuration', {
      hasApiKey: Boolean(apiKey),
      hasApiSecret: Boolean(apiSecret),
      hasUrl: Boolean(url),
    });
    await logDiagnostics(getDb(c), {
      category: 'livekit',
      message: 'Missing configuration',
      data: {
        hasApiKey: Boolean(apiKey),
        hasApiSecret: Boolean(apiSecret),
        hasUrl: Boolean(url),
      },
    });
    return c.json({ error: 'LiveKit not configured', code: 'LIVEKIT_CONFIG_MISSING' }, 500);
  }

  try {
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
        console.warn('[LiveKit] Unauthorized connection token request', {
          userId,
          roomId,
          reason: verification?.reason,
        });
        await logDiagnostics(db, {
          category: 'livekit',
          message: 'Unauthorized connection token request',
          data: { userId, roomId, reason: verification?.reason },
        });
        return c.json({ error: 'Unauthorized', code: verification?.reason }, 403);
      }
    }

    if (roomType === 'live') {
      const liveRoom = await db
        .prepare('SELECT host_id, status FROM live_rooms WHERE id = ?')
        .bind(roomId)
        .first();
      if (!liveRoom || liveRoom.status !== 'live') {
        console.warn('[LiveKit] Live room not available', {
          userId,
          roomId,
          status: liveRoom?.status,
        });
        await logDiagnostics(db, {
          category: 'livekit',
          message: 'Live room not available',
          data: { userId, roomId, status: liveRoom?.status },
        });
        return c.json({ error: 'Live room not available', code: 'LIVE_ROOM_NOT_LIVE' }, 404);
      }
      const participant = await db
        .prepare('SELECT 1 FROM live_room_participants WHERE room_id = ? AND user_id = ? AND left_at IS NULL')
        .bind(roomId, userId)
        .first();
      if (!participant && liveRoom.host_id !== userId) {
        console.warn('[LiveKit] Unauthorized live room token request', {
          userId,
          roomId,
        });
        await logDiagnostics(db, {
          category: 'livekit',
          message: 'Unauthorized live room token request',
          data: { userId, roomId },
        });
        return c.json({ error: 'Unauthorized', code: 'LIVE_ROOM_UNAUTHORIZED' }, 403);
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
  } catch (error) {
    console.error('[LiveKit] Token generation failed', {
      message: error?.message,
      stack: error?.stack,
    });
    await logDiagnostics(getDb(c), {
      category: 'livekit',
      message: 'Token generation failed',
      data: { message: error?.message },
    });
    return c.json({ error: 'LiveKit token error', code: 'LIVEKIT_TOKEN_ERROR' }, 500);
  }
});

livekit.get('/diagnostics', async (c) => {
  const key = c.req.header('X-Diagnostics-Key');
  if (!key || !c.env.DIAGNOSTICS_KEY || key !== c.env.DIAGNOSTICS_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const limit = Math.min(Number(c.req.query('limit') || 50), 200);
  const db = getDb(c);
  const { results } = await db
    .prepare(
      `SELECT id, category, message, data, created_at
       FROM diagnostics_log
       WHERE category = 'livekit'
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  return c.json({ logs: results || [] });
});

export default livekit;
