import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sanitizeName } from '../utils/sanitize.js';
import { generateVerificationToken, getVerificationExpiry, sendVerificationEmail, generateResetToken, getResetExpiry, sendPasswordResetEmail } from '../utils/email.js';
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
  const verificationToken = generateVerificationToken();
  const verificationExpiry = getVerificationExpiry();
  
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
    email_verified: 0,
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpiry,
  });

  // Send verification email
  await sendVerificationEmail(parsed.data.email, verificationToken, c.env);

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
      email_verified: false,
    },
    message: 'Account created. Please check your email to verify your account.',
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

  const { password_hash, ...safeUser } = user;

  return c.json({ user: safeUser });
});

// Email verification endpoint
auth.post('/verify-email', async (c) => {
  const body = await c.req.json().catch(() => null);
  const token = body?.token;
  
  if (!token) {
    return c.json({ error: 'Verification token is required.' }, 400);
  }
  
  const db = getDb(c);
  const user = await db
    .prepare('SELECT * FROM users WHERE email_verification_token = ? AND email_verification_expires > datetime("now")')
    .bind(token)
    .first();
    
  if (!user) {
    return c.json({ error: 'Invalid or expired verification token.' }, 400);
  }
  
  // Mark email as verified
  await db
    .prepare('UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?')
    .bind(user.id)
    .run();
    
  return c.json({ message: 'Email verified successfully.' });
});

// Password reset request
auth.post('/forgot-password', authRateLimit, async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = body?.email;
  
  if (!email) {
    return c.json({ error: 'Email is required.' }, 400);
  }
  
  const db = getDb(c);
  const user = await getUserByEmail(db, email);
  
  // Always return success to prevent email enumeration
  if (!user) {
    return c.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  }
  
  const resetToken = generateResetToken();
  const resetExpiry = getResetExpiry();
  
  await db
    .prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
    .bind(resetToken, resetExpiry, user.id)
    .run();
    
  await sendPasswordResetEmail(email, resetToken, c.env);
  
  return c.json({ message: 'If an account with that email exists, a reset link has been sent.' });
});

// Password reset
auth.post('/reset-password', authRateLimit, async (c) => {
  const body = await c.req.json().catch(() => null);
  const { token, password } = body || {};
  
  if (!token || !password) {
    return c.json({ error: 'Token and new password are required.' }, 400);
  }
  
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters.' }, 400);
  }
  
  const db = getDb(c);
  const user = await db
    .prepare('SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > datetime("now")')
    .bind(token)
    .first();
    
  if (!user) {
    return c.json({ error: 'Invalid or expired reset token.' }, 400);
  }
  
  const password_hash = await hashPassword(password);
  
  await db
    .prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?')
    .bind(password_hash, user.id)
    .run();
    
  return c.json({ message: 'Password reset successfully.' });
});

// Account deletion endpoint for GDPR compliance
auth.delete('/delete-account', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  
  // Verify user exists
  const user = await getUserById(db, userId);
  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }
  
  try {
    // Delete user data in correct order (respecting foreign keys)
    await db.prepare('DELETE FROM story_images WHERE story_id IN (SELECT id FROM stories WHERE user_id = ?)').bind(userId).run();
    await db.prepare('DELETE FROM stories WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM messages WHERE sender_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM connection_requests WHERE sender_id = ? OR receiver_id = ?').bind(userId, userId).run();
    await db.prepare('DELETE FROM connections WHERE user_id_1 = ? OR user_id_2 = ?').bind(userId, userId).run();
    await db.prepare('DELETE FROM token_transactions WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM token_requests WHERE requester_id = ? OR recipient_id = ?').bind(userId, userId).run();
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    
    return c.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Account deletion error:', error);
    return c.json({ error: 'Failed to delete account. Please try again.' }, 500);
  }
});

// Data export endpoint for GDPR compliance
auth.get('/export-data', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  
  // Get user data
  const user = await getUserById(db, userId);
  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }
  
  // Get user's stories
  const stories = await db
    .prepare('SELECT * FROM stories WHERE user_id = ?')
    .bind(userId)
    .all();
    
  // Get user's messages
  const messages = await db
    .prepare('SELECT * FROM messages WHERE sender_id = ?')
    .bind(userId)
    .all();
    
  // Get user's connections
  const connections = await db
    .prepare('SELECT * FROM connections WHERE user_id_1 = ? OR user_id_2 = ?')
    .bind(userId, userId)
    .all();
    
  // Get token transactions
  const transactions = await db
    .prepare('SELECT * FROM token_transactions WHERE user_id = ?')
    .bind(userId)
    .all();
  
  const { password_hash, email_verification_token, password_reset_token, ...safeUser } = user;
  
  const exportData = {
    user: safeUser,
    stories: stories.results || [],
    messages: messages.results || [],
    connections: connections.results || [],
    transactions: transactions.results || [],
    exportedAt: new Date().toISOString()
  };
  
  return c.json(exportData);
});

export default auth;
