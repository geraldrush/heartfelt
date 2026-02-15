import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  getDb,
  getTokenTransactions,
  getUserById,
  generateId,
} from '../utils/db.js';
import { tokenHistorySchema, tokenTransferSchema } from '../utils/validation.js';
import { createNotification } from './notifications.js';

const tokens = new Hono();

tokens.get('/balance', authMiddleware, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');
  const user = await getUserById(db, userId);

  if (!user) {
    return c.json({ error: 'User not found.' }, 404);
  }

  return c.json({ balance: user.token_balance, user_id: user.id });
});

tokens.post('/transfer', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tokenTransferSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const senderId = c.get('userId');

  if (parsed.data.recipient_id === senderId) {
    return c.json({ error: 'Cannot transfer tokens to yourself.' }, 400);
  }

  const sender = await getUserById(db, senderId);
  if (!sender) {
    return c.json({ error: 'Sender not found.' }, 404);
  }

  const recipient = await getUserById(db, parsed.data.recipient_id);
  if (!recipient) {
    return c.json({ error: 'Recipient not found.' }, 404);
  }

  const amount = parsed.data.amount;
  const timestamp = new Date().toISOString();
  const senderTxId = generateId();
  const recipientTxId = generateId();
  const senderDescription = parsed.data.message || 'Token transfer sent';
  const recipientDescription = parsed.data.message || 'Token transfer received';

  const senderUpdate = await db
    .prepare(
      `UPDATE users
       SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND token_balance >= ?
       RETURNING token_balance`
    )
    .bind(amount, senderId, amount)
    .first();

  if (!senderUpdate || senderUpdate.token_balance == null) {
    return c.json({ error: 'Insufficient balance.' }, 402);
  }

  const recipientUpdate = await db
    .prepare(
      `UPDATE users
       SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING token_balance`
    )
    .bind(amount, parsed.data.recipient_id)
    .first();

  if (!recipientUpdate || recipientUpdate.token_balance == null) {
    return c.json({ error: 'Recipient update failed.' }, 500);
  }

  await db
    .prepare(
      `INSERT INTO token_transactions (
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
      VALUES (?, ?, ?, 'transfer_sent', ?, NULL, ?, ?, ?)`
    )
    .bind(
      senderTxId,
      senderId,
      -amount,
      parsed.data.recipient_id,
      senderUpdate.token_balance,
      senderDescription,
      timestamp
    )
    .run();

  await db
    .prepare(
      `INSERT INTO token_transactions (
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
      VALUES (?, ?, ?, 'transfer_received', ?, NULL, ?, ?, ?)`
    )
    .bind(
      recipientTxId,
      parsed.data.recipient_id,
      amount,
      senderId,
      recipientUpdate.token_balance,
      recipientDescription,
      timestamp
    )
    .run();

  // Send notification to recipient
  try {
    await createNotification(
      db,
      {
        user_id: parsed.data.recipient_id,
        type: 'token_request',
        title: 'Tokens Received',
        message: `You received ${amount} tokens${parsed.data.message ? `: ${parsed.data.message}` : ''}`,
        data: { sender_id: senderId, amount, notification_type: 'token_received' }
      },
      c.env
    );
  } catch (error) {
    console.error('Failed to create notification:', error);
  }

  return c.json({
    success: true,
    new_balance: senderUpdate.token_balance,
    transferred_amount: amount,
    recipient_id: parsed.data.recipient_id,
  });
});

tokens.get('/history', authMiddleware, async (c) => {
  const parsed = tokenHistorySchema.safeParse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
  });

  if (!parsed.success) {
    return c.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      400
    );
  }

  const db = getDb(c);
  const userId = c.get('userId');
  const transactions = await getTokenTransactions(
    db,
    userId,
    parsed.data.limit,
    parsed.data.offset
  );

  return c.json({
    transactions,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
    user_id: userId,
  });
});

tokens.post('/withdraw', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const db = getDb(c);
  const userId = c.get('userId');

  if (!body || !body.tokens || !body.payment_method) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const tokens = parseInt(body.tokens);
  const MIN_WITHDRAWAL = 500;
  const TOKEN_TO_RAND = 2;

  if (tokens < MIN_WITHDRAWAL) {
    return c.json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL} tokens` }, 400);
  }

  const user = await getUserById(db, userId);
  if (!user || user.token_balance < tokens) {
    return c.json({ error: 'Insufficient balance' }, 402);
  }

  const amountRand = tokens * TOKEN_TO_RAND;
  const requestId = generateId();

  await db.batch([
    db.prepare('UPDATE users SET token_balance = token_balance - ? WHERE id = ?').bind(tokens, userId),
    db.prepare(
      `INSERT INTO token_transactions (id, user_id, amount, type, description)
       VALUES (?, ?, ?, 'withdrawal', ?)`
    ).bind(generateId(), userId, -tokens, `Withdrawal request: R${amountRand}`),
    db.prepare(
      `INSERT INTO withdrawal_requests (id, user_id, tokens, amount_rand, payment_method, bank_details, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(requestId, userId, tokens, amountRand, body.payment_method, body.bank_details ? JSON.stringify(body.bank_details) : null)
  ]);

  return c.json({ success: true, request_id: requestId, new_balance: user.token_balance - tokens });
});

export default tokens;
