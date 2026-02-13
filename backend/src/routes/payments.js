import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { generateId, getDb, getUserById } from '../utils/db.js';
import { paymentInitiateSchema } from '../utils/validation.js';
import {
  generateSignature,
  getPayfastUrl,
  validateItnSource,
  verifySignature,
  buildSignaturePayload,
} from '../utils/payfast.js';

const payments = new Hono();

const parseUrlList = (raw) =>
  (raw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const getPayfastPassphrase = (env) => {
  const mode = (env.PAYFAST_MODE || '').toLowerCase();
  if (mode === 'live') {
    return env.PAYFAST_PASSPHRASE_LIVE || env.PAYFAST_PASSPHRASE || '';
  }
  return env.PAYFAST_PASSPHRASE_SANDBOX || env.PAYFAST_PASSPHRASE || '';
};

const pickFrontendUrl = (env) => {
  const urls = parseUrlList(env.FRONTEND_URL);
  if (urls.length === 0) {
    return '';
  }

  const mode = (env.PAYFAST_MODE || '').toLowerCase();
  if (mode === 'live') {
    const production =
      urls.find((url) => url.includes('afrodate.co.za')) ||
      urls.find((url) => url.startsWith('https://') && !url.includes('localhost')) ||
      urls.find((url) => url.startsWith('https://')) ||
      urls[0];
    return production.replace(/\/$/, '');
  }

  const dev =
    urls.find((url) => url.includes('localhost')) ||
    urls.find((url) => url.startsWith('http://')) ||
    urls[0];
  return dev.replace(/\/$/, '');
};

payments.get('/packages', async (c) => {
  const db = getDb(c);
  const { results } = await db
    .prepare(
      `SELECT id, name, amount, price_cents, currency
       FROM tokens
       WHERE is_active = 1
       ORDER BY price_cents ASC`
    )
    .all();

  return c.json({ packages: results });
});

payments.post('/initiate', authMiddleware, async (c) => {
  // CSRF protection for payment initiation
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const raw = c.env.CORS_ORIGIN || '';
  const allowed = raw.split(',').map(value => value.trim()).filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'https://heartfelt.pages.dev'];
  const list = allowed.length > 0 ? allowed : defaultOrigins;
  
  if (origin && !list.includes(origin)) {
    return c.json({ error: 'Forbidden origin' }, 403);
  }
  
  if (referer && !list.some(allowedOrigin => referer.startsWith(allowedOrigin))) {
    return c.json({ error: 'Invalid referer' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = paymentInitiateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  const packageRow = await db
    .prepare(
      `SELECT id, name, amount, price_cents, currency
       FROM tokens
       WHERE id = ? AND is_active = 1`
    )
    .bind(parsed.data.package_id)
    .first();

  if (!packageRow) {
    return c.json({ error: 'Package not found.' }, 404);
  }

  const merchantId = c.env.PAYFAST_MERCHANT_ID;
  const merchantKey = c.env.PAYFAST_MERCHANT_KEY;

  if (!merchantId || !merchantKey) {
    return c.json({ error: 'Payfast is not configured.' }, 500);
  }

  const frontendUrl = pickFrontendUrl(c.env);
  if (!frontendUrl) {
    return c.json({ error: 'Frontend URL is not configured.' }, 500);
  }

  const paymentId = generateId();
  await db
    .prepare(
      `INSERT INTO payments (id, user_id, package_id, amount_cents, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .bind(paymentId, userId, packageRow.id, packageRow.price_cents)
    .run();

  const amount = (packageRow.price_cents / 100).toFixed(2);
  const pricePerToken = (packageRow.price_cents / packageRow.amount / 100).toFixed(2);
  const itemDescription = `${packageRow.amount} token(s) @ R${pricePerToken} per token`;
  const baseUrl = new URL(c.req.url).origin;

  const paymentData = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${frontendUrl}/tokens?payment=success&id=${paymentId}`,
    cancel_url: `${frontendUrl}/tokens?payment=cancelled`,
    notify_url: `${baseUrl}/api/payments/notify`,
    name_first: user.first_name || 'User',
    name_last: user.last_name || 'Name',
    email_address: user.email,
    amount,
    item_name: packageRow.name,
    item_description: itemDescription,
    m_payment_id: paymentId,
  };

  const signature = generateSignature(paymentData, getPayfastPassphrase(c.env));
  if ((c.env.PAYFAST_SIGNATURE_DEBUG || '').toLowerCase() === 'true') {
    const debugPayload = buildSignaturePayload(paymentData, getPayfastPassphrase(c.env), {
      maskPassphrase: true,
      maskEmail: true,
    });
    console.log('[Payfast] Signature debug', {
      mode: c.env.PAYFAST_MODE,
      merchant_id: merchantId,
      payment_id: paymentId,
      return_url: paymentData.return_url,
      cancel_url: paymentData.cancel_url,
      notify_url: paymentData.notify_url,
      has_passphrase: Boolean(getPayfastPassphrase(c.env)),
      payload: debugPayload,
      signature,
    });
  }

  return c.json({
    payment_url: getPayfastUrl(c.env),
    payment_data: { ...paymentData, signature },
  });
});

payments.post('/notify', async (c) => {
  if (!validateItnSource(c.req)) {
    return c.text('Invalid source', 403);
  }

  const body = await c.req.text();
  const params = new URLSearchParams(body);
  const payload = Object.fromEntries(params.entries());
  const receivedSignature = payload.signature;
  delete payload.signature;

  const passphrase = getPayfastPassphrase(c.env);
  if (!verifySignature(payload, receivedSignature, passphrase)) {
    if ((c.env.PAYFAST_SIGNATURE_DEBUG || '').toLowerCase() === 'true') {
      const debugPayload = buildSignaturePayload(payload, passphrase, {
        maskPassphrase: true,
        maskEmail: true,
      });
      console.log('[Payfast] ITN signature mismatch', {
        payment_id: payload.m_payment_id,
        has_passphrase: Boolean(passphrase),
        payload: debugPayload,
        received_signature: receivedSignature,
      });
    }
    return c.text('Invalid signature', 400);
  }

  const paymentId = payload.m_payment_id;
  if (!paymentId) {
    return c.text('Missing payment id', 400);
  }

  const db = getDb(c);
  const payment = await db
    .prepare(
      `SELECT
        payments.id,
        payments.user_id,
        payments.amount_cents,
        payments.status,
        payments.package_id,
        tokens.amount AS token_amount,
        tokens.name AS package_name
      FROM payments
      JOIN tokens ON tokens.id = payments.package_id
      WHERE payments.id = ?`
    )
    .bind(paymentId)
    .first();

  if (!payment) {
    return c.text('Payment not found', 404);
  }

  if (payment.status !== 'pending') {
    return c.text('OK', 200);
  }

  const grossAmount = Number(payload.amount_gross);
  const grossCents = Number.isFinite(grossAmount)
    ? Math.round(grossAmount * 100)
    : NaN;

  if (!Number.isFinite(grossCents) || grossCents !== payment.amount_cents) {
    return c.text('Amount mismatch', 400);
  }

  if (payload.payment_status === 'COMPLETE') {
    const transactionId = generateId();
    const timestamp = new Date().toISOString();
    const description = `Purchased ${payment.package_name}`;
    const payfastPaymentId = payload.pf_payment_id || null;

    await db
      .prepare(
        `WITH updated_payment AS (
          UPDATE payments
          SET status = 'completed',
              completed_at = CURRENT_TIMESTAMP,
              payfast_payment_id = ?
          WHERE id = ? AND status = 'pending'
          RETURNING id
        ),
        updated_user AS (
          UPDATE users
          SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND EXISTS (SELECT 1 FROM updated_payment)
          RETURNING token_balance
        ),
        inserted_tx AS (
          INSERT INTO token_transactions (
            id,
            user_id,
            amount,
            transaction_type,
            balance_after,
            description,
            created_at
          )
          SELECT ?, ?, ?, 'purchase', token_balance, ?, ?
          FROM updated_user
        )
        SELECT token_balance FROM updated_user`
      )
      .bind(
        payfastPaymentId,
        paymentId,
        payment.token_amount,
        payment.user_id,
        transactionId,
        payment.user_id,
        payment.token_amount,
        description,
        timestamp
      )
      .run();

    return c.text('OK', 200);
  }

  await db
    .prepare(
      `UPDATE payments
       SET status = 'failed',
           payfast_payment_id = ?
       WHERE id = ? AND status = 'pending'`
    )
    .bind(payload.pf_payment_id || null, paymentId)
    .run();

  return c.text('OK', 200);
});

payments.post('/refund/:paymentId', async (c) => {
  // CSRF protection for refund operations
  const origin = c.req.header('Origin');
  const referer = c.req.header('Referer');
  
  const raw = c.env.CORS_ORIGIN || '';
  const allowed = raw.split(',').map(value => value.trim()).filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'https://heartfelt.pages.dev'];
  const list = allowed.length > 0 ? allowed : defaultOrigins;
  
  if (origin && !list.includes(origin)) {
    return c.json({ error: 'Forbidden origin' }, 403);
  }
  
  if (referer && !list.some(allowedOrigin => referer.startsWith(allowedOrigin))) {
    return c.json({ error: 'Invalid referer' }, 403);
  }

  const secret = c.req.header('x-internal-secret');
  const expectedSecret = c.env.PAYFAST_REFUND_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return c.json({ error: 'Forbidden.' }, 403);
  }

  const paymentId = c.req.param('paymentId');
  const db = getDb(c);
  const payment = await db
    .prepare(
      `SELECT
        payments.id,
        payments.user_id,
        payments.status,
        tokens.amount AS token_amount
      FROM payments
      JOIN tokens ON tokens.id = payments.package_id
      WHERE payments.id = ?`
    )
    .bind(paymentId)
    .first();

  if (!payment) {
    return c.json({ error: 'Payment not found.' }, 404);
  }

  if (payment.status !== 'completed') {
    return c.json({ error: 'Only completed payments can be refunded.' }, 400);
  }

  const amount = payment.token_amount;
  const transactionId = generateId();
  const timestamp = new Date().toISOString();
  const description = `Refund for payment ${paymentId}`;

  const refundResult = await db
    .prepare(
      `WITH updated_payment AS (
        UPDATE payments
        SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'completed'
        RETURNING id, user_id
      ),
      updated_user AS (
        UPDATE users
        SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT user_id FROM updated_payment) AND token_balance >= ?
        RETURNING id, token_balance
      ),
      inserted_tx AS (
        INSERT INTO token_transactions (
          id,
          user_id,
          amount,
          transaction_type,
          related_user_id,
          related_entity_id,
          balance_after,
          description,
          created_at
        )
        SELECT ?, updated_user.id, ?, 'refund', NULL, updated_payment.id, updated_user.token_balance, ?, ?
        FROM updated_user
        CROSS JOIN updated_payment
      )
      SELECT updated_user.token_balance AS balance_after FROM updated_user`
    )
    .bind(paymentId, amount, amount, transactionId, amount * -1, description, timestamp)
    .first();

  if (!refundResult || refundResult.balance_after == null) {
    return c.json({ error: 'Insufficient balance to refund tokens.' }, 402);
  }

  return c.json({
    success: true,
    refunded_amount: amount,
    new_balance: refundResult.balance_after,
  });
});

payments.get('/status/:paymentId', authMiddleware, async (c) => {
  const paymentId = c.req.param('paymentId');
  const db = getDb(c);
  const userId = c.get('userId');

  const payment = await db
    .prepare(
      `SELECT
        payments.id,
        payments.user_id,
        payments.amount_cents,
        payments.status,
        payments.created_at,
        payments.completed_at,
        tokens.name AS package_name
      FROM payments
      JOIN tokens ON tokens.id = payments.package_id
      WHERE payments.id = ?`
    )
    .bind(paymentId)
    .first();

  if (!payment) {
    return c.json({ error: 'Payment not found.' }, 404);
  }

  if (payment.user_id !== userId) {
    return c.json({ error: 'Forbidden.' }, 403);
  }

  return c.json({
    id: payment.id,
    status: payment.status,
    amount_cents: payment.amount_cents,
    package_name: payment.package_name,
    created_at: payment.created_at,
    completed_at: payment.completed_at,
  });
});

export default payments;
