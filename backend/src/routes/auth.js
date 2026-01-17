import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
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

const auth = new Hono();

const signupBonusTokens = 50;

function userResponse(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    token_balance: user.token_balance,
    profile_complete: Boolean(user.profile_complete),
  };
}

auth.post('/email-signup', async (c) => {
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

  const password_hash = await hashPassword(parsed.data.password);
  const { id } = await createUser(db, {
    email: parsed.data.email,
    password_hash,
    full_name: parsed.data.full_name,
    age: parsed.data.age,
    gender: parsed.data.gender,
    nationality: parsed.data.nationality,
    location_city: parsed.data.location_city,
    location_province: parsed.data.location_province,
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

auth.post('/email-login', async (c) => {
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

auth.post('/google', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = googleAuthSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      parsed.data.credential
    )}`
  );

  if (!tokenInfoResponse.ok) {
    return c.json({ error: 'Invalid Google credential.' }, 401);
  }

  const tokenInfo = await tokenInfoResponse.json();
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

  const { password_hash, ...safeUser } = user;

  return c.json({ user: safeUser });
});

export default auth;
