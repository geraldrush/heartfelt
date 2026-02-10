import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { generateId, getDb, getUserById } from '../utils/db.js';
import { createNotification } from './notifications.js';

const social = new Hono();

// Like a user
social.post('/like', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { user_id } = body || {};
  
  if (!user_id) {
    return c.json({ error: 'User ID is required.' }, 400);
  }
  
  const db = getDb(c);
  const userId = c.get('userId');
  
  if (user_id === userId) {
    return c.json({ error: 'Cannot like yourself.' }, 400);
  }
  
  const likeId = generateId();
  
  try {
    await db
      .prepare('INSERT INTO likes (id, liker_id, liked_user_id) VALUES (?, ?, ?)')
      .bind(likeId, userId, user_id)
      .run();

    const liker = await getUserById(db, userId);
    if (liker) {
      await createNotification(
        db,
        {
          user_id,
          type: 'system',
          title: 'New like',
          message: `${liker.full_name} liked your profile`,
          data: { sender_id: userId, notification_type: 'like' }
        },
        c.env
      );
    }
    
    return c.json({ message: 'User liked successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'You already liked this user.' }, 409);
    }
    throw error;
  }
});

// Unlike a user
social.post('/unlike', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { user_id } = body || {};
  
  if (!user_id) {
    return c.json({ error: 'User ID is required.' }, 400);
  }
  
  const db = getDb(c);
  const userId = c.get('userId');
  
  await db
    .prepare('DELETE FROM likes WHERE liker_id = ? AND liked_user_id = ?')
    .bind(userId, user_id)
    .run();
  
  return c.json({ message: 'User unliked successfully.' });
});

// Follow a user
social.post('/follow', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { user_id } = body || {};
  
  if (!user_id) {
    return c.json({ error: 'User ID is required.' }, 400);
  }
  
  const db = getDb(c);
  const userId = c.get('userId');
  
  if (user_id === userId) {
    return c.json({ error: 'Cannot follow yourself.' }, 400);
  }
  
  const followId = generateId();
  
  try {
    await db
      .prepare('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)')
      .bind(followId, userId, user_id)
      .run();

    const follower = await getUserById(db, userId);
    if (follower) {
      await createNotification(
        db,
        {
          user_id,
          type: 'system',
          title: 'New follower',
          message: `${follower.full_name} started following you`,
          data: { sender_id: userId, notification_type: 'follow' }
        },
        c.env
      );
    }
    
    return c.json({ message: 'User followed successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'You already follow this user.' }, 409);
    }
    throw error;
  }
});

// Unfollow a user
social.post('/unfollow', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { user_id } = body || {};
  
  if (!user_id) {
    return c.json({ error: 'User ID is required.' }, 400);
  }
  
  const db = getDb(c);
  const userId = c.get('userId');
  
  await db
    .prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
    .bind(userId, user_id)
    .run();
  
  return c.json({ message: 'User unfollowed successfully.' });
});

export default social;
