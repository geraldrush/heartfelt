import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  getDb,
  getTokenTransactions,
  getUserById,
  generateId,
} from '../utils/db.js';
import { tokenHistorySchema, tokenTransferSchema } from '../utils/validation.js';

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

  const transferResult = await db
    .prepare(
      `WITH updated_sender AS (
        UPDATE users
        SET token_balance = token_balance - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND token_balance >= ? AND EXISTS (SELECT 1 FROM users WHERE id = ?)
        RETURNING id, token_balance
      ),
      updated_recipient AS (
        UPDATE users
        SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND EXISTS (SELECT 1 FROM updated_sender)
        RETURNING id, token_balance
      ),
      insert_sender AS (
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
        SELECT ?, id, ?, 'transfer_sent', ?, NULL, token_balance, ?, ?
        FROM updated_sender
      ),
      insert_recipient AS (
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
        SELECT ?, id, ?, 'transfer_received', ?, NULL, token_balance, ?, ?
        FROM updated_recipient
      )
      SELECT token_balance AS sender_balance FROM updated_sender`
    )
    .bind(
      amount,
      senderId,
      amount,
      parsed.data.recipient_id,
      amount,
      parsed.data.recipient_id,
      senderTxId,
      -amount,
      parsed.data.recipient_id,
      senderDescription,
      timestamp,
      recipientTxId,
      amount,
      senderId,
      recipientDescription,
      timestamp
    )
    .first();

  if (!transferResult) {
    return c.json({ error: 'Insufficient balance.' }, 402);
  }

  return c.json({
    success: true,
    new_balance: transferResult.sender_balance,
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

export default tokens;
