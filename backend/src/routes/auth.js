import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sanitizeName } from '../utils/sanitize.js';
import {
  createUser,
  generateId,
  getDb,
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
} from '../utils/db.js';
import {
  emailLoginSchema,
  emailSignupSchema,
  googleAuthSchema,
} from '../utils/validation.js';
import { getAllowedOrigins, isOriginAllowed, isRefererAllowed } from '../utils/cors.js';

const auth = new Hono();

const getSignupBonusTokens = (c) => {
  const raw = Number(c.env.SIGNUP_BONUS_TOKENS);
  const value = Number.isFinite(raw) ? Math.trunc(raw) : NaN;
  return value >= 1 ? value : 2;
};

function userResponse(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    token_balance: user.token_balance,
    profile_complete: Boolean(user.profile_complete),
    age: user.age,
    gender: user.gender,
    nationality: user.nationality,
    religion: user.religion,
    race: user.race,
    education: user.education,
    has_kids: user.has_kids === null || user.has_kids === undefined ? null : Boolean(user.has_kids),
    num_kids: user.num_kids,
    smoker: user.smoker === null || user.smoker === undefined ? null : Boolean(user.smoker),
    drinks_alcohol:
      user.drinks_alcohol === null || user.drinks_alcohol === undefined
        ? null
        : Boolean(user.drinks_alcohol),
    location_city: user.location_city,
    location_province: user.location_province,
    seeking_gender: user.seeking_gender,
    seeking_age_min: user.seeking_age_min,
    seeking_age_max: user.seeking_age_max,
    seeking_races: user.seeking_races ? JSON.parse(user.seeking_races) : [],
  };
}

auth.post('/email-signup', authRateLimit, async (c) => {
  // CSRF protection for state-changing auth operations
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const isValidOrigin = origin ? isOriginAllowed(origin, c.env) : false;
  const isValidReferer = referer ? isRefererAllowed(referer, c.env) : false;
  
  if (!isValidOrigin && !isValidReferer) {
    const allowedOrigins = getAllowedOrigins(c.env);
    console.log(`[Auth] Invalid origin/referer: origin=${origin}, referer=${referer}, allowed: ${allowedOrigins.join(', ')}`);
    return c.json({ error: 'Invalid origin or referer' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = emailSignupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const existingUser = await getUserByEmail(db, parsed.data.email);
  if (existingUser) {
    return c.json({ error: 'Email already exists.' }, 409);
  }

  const signupBonusTokens = getSignupBonusTokens(c);
  const password_hash = await hashPassword(parsed.data.password);
  
  const { id } = await createUser(db, {
    email: parsed.data.email,
    password_hash,
    full_name: sanitizeName(parsed.data.full_name),
    age: parsed.data.age ?? null,
    gender: parsed.data.gender ?? null,
    nationality: parsed.data.nationality ? sanitizeName(parsed.data.nationality) : null,
    location_city: parsed.data.location_city ? sanitizeName(parsed.data.location_city) : null,
    location_province: parsed.data.location_province ? sanitizeName(parsed.data.location_province) : null,
    token_balance: signupBonusTokens,
    profile_complete: 0,
  });

  await db
    .prepare(
      `INSERT INTO token_transactions (
        id,
        user_id,
        amount,
        transaction_type,
        balance_after,
        description
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      id,
      signupBonusTokens,
      'signup_bonus',
      signupBonusTokens,
      'Signup bonus'
    )
    .run();

  const token = await generateToken(id, c.env.JWT_SECRET);

  return c.json({
    token,
    user: {
      id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      token_balance: signupBonusTokens,
      profile_complete: false,
    },
  });
});

auth.post('/email-login', authRateLimit, async (c) => {
  // CSRF protection for state-changing auth operations
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const isValidOrigin = origin ? isOriginAllowed(origin, c.env) : false;
  const isValidReferer = referer ? isRefererAllowed(referer, c.env) : false;
  
  if (!isValidOrigin && !isValidReferer) {
    const allowedOrigins = getAllowedOrigins(c.env);
    console.log(`[Auth] Invalid origin/referer: origin=${origin}, referer=${referer}, allowed: ${allowedOrigins.join(', ')}`);
    return c.json({ error: 'Invalid origin or referer' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = emailLoginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const user = await getUserByEmail(db, parsed.data.email);
  if (!user || !user.password_hash) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const isValid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!isValid) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({ token, user: userResponse(user) });
});

auth.post('/google', authRateLimit, async (c) => {
  // CSRF protection for state-changing auth operations
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const isValidOrigin = origin ? isOriginAllowed(origin, c.env) : false;
  const isValidReferer = referer ? isRefererAllowed(referer, c.env) : false;
  
  if (!isValidOrigin && !isValidReferer) {
    const allowedOrigins = getAllowedOrigins(c.env);
    console.log(`[Auth] Invalid origin/referer: origin=${origin}, referer=${referer}, allowed: ${allowedOrigins.join(', ')}`);
    return c.json({ error: 'Invalid origin or referer' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = googleAuthSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  // SSRF protection - validate and restrict external requests
  const allowedGoogleUrl = 'https://oauth2.googleapis.com/tokeninfo';
  const tokenInfoUrl = new URL(allowedGoogleUrl);
  tokenInfoUrl.searchParams.set('id_token', parsed.data.credential);
  
  // Ensure we're only making requests to Google's OAuth endpoint
  if (tokenInfoUrl.origin !== 'https://oauth2.googleapis.com' || 
      !tokenInfoUrl.pathname.startsWith('/tokeninfo')) {
    return c.json({ error: 'Invalid request destination.' }, 400);
  }

  const tokenInfoResponse = await fetch(tokenInfoUrl.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': 'Heartfelt-Backend/1.0'
    }
  });

  if (!tokenInfoResponse.ok) {
    // Consume response body to prevent resource leak
    await tokenInfoResponse.text().catch(() => {});
    return c.json({ error: 'Invalid Google credential.' }, 401);
  }

  const signupBonusTokens = getSignupBonusTokens(c);
  let tokenInfo;
  try {
    tokenInfo = await tokenInfoResponse.json();
  } catch (error) {
    return c.json({ error: 'Invalid Google credential response.' }, 401);
  }
  const googleId = tokenInfo.sub;
  const email = tokenInfo.email;
  const fullName = tokenInfo.name || tokenInfo.email || 'Heartfelt User';
  const tokenAudience = tokenInfo.aud || tokenInfo.azp;

  if (tokenAudience !== c.env.GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Invalid Google credential.' }, 401);
  }

  if (!tokenInfo.email_verified) {
    return c.json({ error: 'Google email is not verified.' }, 401);
  }

  if (!email) {
    return c.json({ error: 'Google account email is missing.' }, 400);
  }

  const db = getDb(c);
  let user = await getUserByGoogleId(db, googleId);
  if (!user && email) {
    user = await getUserByEmail(db, email);
  }

  if (user) {
    if (!user.google_id) {
      await db
        .prepare('UPDATE users SET google_id = ? WHERE id = ?')
        .bind(googleId, user.id)
        .run();
      user.google_id = googleId;
    }
  } else {
    const created = await createUser(db, {
      email,
      google_id: googleId,
      full_name: fullName,
      age: null,
      gender: null,
      nationality: null,
      location_city: null,
      location_province: null,
      token_balance: signupBonusTokens,
      profile_complete: 0,
    });

    await db
      .prepare(
        `INSERT INTO token_transactions (
          id,
          user_id,
          amount,
          transaction_type,
          balance_after,
          description
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        created.id,
        signupBonusTokens,
        'signup_bonus',
        signupBonusTokens,
        'Signup bonus'
      )
      .run();

    user = await getUserById(db, created.id);
  }

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({ token, user: userResponse(user) });
});

auth.post('/refresh', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const token = await generateToken(user.id, c.env.JWT_SECRET);

  return c.json({ token, user: userResponse(user) });
});

auth.get('/me', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  return c.json({ user: userResponse(user) });
});

auth.delete('/account', authMiddleware, async (c) => {
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');

  const isValidOrigin = origin ? isOriginAllowed(origin, c.env) : false;
  const isValidReferer = referer ? isRefererAllowed(referer, c.env) : false;

  if (!isValidOrigin && !isValidReferer) {
    const allowedOrigins = getAllowedOrigins(c.env);
    console.log(`[Auth] Invalid origin/referer: origin=${origin}, referer=${referer}, allowed: ${allowedOrigins.join(', ')}`);
    return c.json({ error: 'Invalid origin or referer' }, 403);
  }

  const db = getDb(c);
  const userId = c.get('userId');

  const tableExists = async (name) => {
    const row = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .bind(name)
      .first();
    return Boolean(row?.name);
  };

  const deleteIfExists = async (name, statement, params = []) => {
    if (!(await tableExists(name))) {
      return;
    }
    await db.prepare(statement).bind(...params).run();
  };

  if (await tableExists('story_images')) {
    const imageRows = await db
      .prepare(
        `SELECT si.original_url, si.blurred_url
         FROM story_images si
         JOIN stories s ON s.id = si.story_id
         WHERE s.user_id = ?`
      )
      .bind(userId)
      .all();

    if (imageRows && Array.isArray(imageRows.results)) {
      for (const row of imageRows.results) {
        if (row.original_url) {
          await c.env.R2_BUCKET.delete(row.original_url);
        }
        if (row.blurred_url) {
          await c.env.R2_BUCKET.delete(row.blurred_url);
        }
      }
    }
  }

  await deleteIfExists(
    'story_images',
    `DELETE FROM story_images WHERE story_id IN (SELECT id FROM stories WHERE user_id = ?)`,
    [userId]
  );
  await deleteIfExists('stories', 'DELETE FROM stories WHERE user_id = ?', [userId]);
  await deleteIfExists(
    'messages',
    `DELETE FROM messages WHERE sender_id = ? OR connection_id IN (
      SELECT id FROM connections WHERE user_id_1 = ? OR user_id_2 = ?
    )`,
    [userId, userId, userId]
  );
  await deleteIfExists(
    'connection_requests',
    'DELETE FROM connection_requests WHERE sender_id = ? OR receiver_id = ?',
    [userId, userId]
  );
  await deleteIfExists(
    'connections',
    'DELETE FROM connections WHERE user_id_1 = ? OR user_id_2 = ?',
    [userId, userId]
  );
  await deleteIfExists('token_transactions', 'DELETE FROM token_transactions WHERE user_id = ?', [userId]);
  await deleteIfExists(
    'token_requests',
    'DELETE FROM token_requests WHERE requester_id = ? OR recipient_id = ?',
    [userId, userId]
  );
  await deleteIfExists(
    'blocked_users',
    'DELETE FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?',
    [userId, userId]
  );
  await deleteIfExists('story_reports', 'DELETE FROM story_reports WHERE reporter_id = ?', [userId]);

  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

  return c.json({ success: true });
});

export default auth;
