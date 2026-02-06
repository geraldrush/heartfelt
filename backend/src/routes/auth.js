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
    age: parsed.data.age,
    gender: parsed.data.gender,
    nationality: sanitizeName(parsed.data.nationality),
    location_city: sanitizeName(parsed.data.location_city),
    location_province: sanitizeName(parsed.data.location_province),
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
    return c.json({ error: 'Invalid Google credential.' }, 401);
  }

  const signupBonusTokens = getSignupBonusTokens(c);
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

  return c.json({ user: userResponse(user) });
});

export default auth;
