export function getDb(c) {
  return c.env.DB;
}

export function generateId() {
  return crypto.randomUUID();
}

export async function getUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
}

export async function getUserByGoogleId(db, googleId) {
  return db.prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(googleId)
    .first();
}

export async function getUserById(db, userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
}

export async function createUser(db, userData) {
  const id = generateId();
  const {
    email,
    google_id,
    password_hash,
    full_name,
    age,
    gender,
    nationality,
    religion,
    race,
    education,
    has_kids = 0,
    num_kids = 0,
    smoker = 0,
    drinks_alcohol = 0,
    location_city,
    location_province,
    location_lat,
    location_lng,
    token_balance = 50,
    profile_complete = 0,
  } = userData;

  await db
    .prepare(
      `INSERT INTO users (
        id,
        email,
        google_id,
        password_hash,
        full_name,
        age,
        gender,
        nationality,
        religion,
        race,
        education,
        has_kids,
        num_kids,
        smoker,
        drinks_alcohol,
        location_city,
        location_province,
        location_lat,
        location_lng,
        token_balance,
        profile_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      email,
      google_id || null,
      password_hash || null,
      full_name,
      age ?? null,
      gender || null,
      nationality || null,
      religion || null,
      race || null,
      education || null,
      has_kids,
      num_kids,
      smoker,
      drinks_alcohol,
      location_city || null,
      location_province || null,
      location_lat ?? null,
      location_lng ?? null,
      token_balance,
      profile_complete ? 1 : 0
    )
    .run();

  return { id };
}

export async function updateUserTokenBalance(db, userId, amount) {
  return db
    .prepare(
      'UPDATE users SET token_balance = token_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    .bind(amount, userId)
    .run();
}

export async function getUserTokenBalance(db, userId) {
  const row = await db
    .prepare('SELECT token_balance FROM users WHERE id = ?')
    .bind(userId)
    .first();
  return row?.token_balance ?? null;
}

export async function createTokenTransaction(db, transactionData) {
  const {
    user_id,
    amount,
    transaction_type,
    related_user_id,
    related_entity_id,
    balance_after,
    description,
    created_at,
  } = transactionData;

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      user_id,
      amount,
      transaction_type,
      related_user_id || null,
      related_entity_id || null,
      balance_after,
      description || null,
      created_at || new Date().toISOString()
    )
    .run();
}

export async function getTokenTransactions(db, userId, limit, offset) {
  const { results } = await db
    .prepare(
      `SELECT
        tt.id,
        tt.amount,
        tt.transaction_type,
        tt.related_user_id,
        tt.description,
        tt.balance_after,
        tt.created_at,
        u.full_name AS related_user_name
      FROM token_transactions tt
      LEFT JOIN users u ON tt.related_user_id = u.id
      WHERE tt.user_id = ?
      ORDER BY tt.created_at DESC
      LIMIT ? OFFSET ?`
    )
    .bind(userId, limit, offset)
    .all();

  return results;
}

export async function createTokenRequest(db, requestData) {
  const { requester_id, recipient_id, amount, reason } = requestData;
  await db
    .prepare(
      `INSERT INTO token_requests (
        id,
        requester_id,
        recipient_id,
        amount,
        reason,
        status
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      requester_id,
      recipient_id,
      amount,
      reason || null,
      'pending'
    )
    .run();
}

export async function getPendingTokenRequests(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT
        tr.id,
        tr.requester_id,
        tr.recipient_id,
        tr.amount,
        tr.reason,
        tr.status,
        tr.created_at,
        u.full_name AS requester_name
      FROM token_requests tr
      LEFT JOIN users u ON tr.requester_id = u.id
      WHERE tr.recipient_id = ? AND tr.status = 'pending'
      ORDER BY tr.created_at DESC`
    )
    .bind(userId)
    .all();

  return results;
}

export async function updateTokenRequestStatus(db, requestId, status) {
  await db
    .prepare(
      `UPDATE token_requests
       SET status = ?
       WHERE id = ?`
    )
    .bind(status, requestId)
    .run();
}

export function buildDistanceQuery(userLat, userLng) {
  return `(6371 * acos(
    cos(radians(${userLat})) * cos(radians(location_lat)) *
    cos(radians(location_lng) - radians(${userLng})) +
    sin(radians(${userLat})) * sin(radians(location_lat))
  ))`;
}

export async function createConnectionRequest(db, senderId, receiverId, message) {
  const id = generateId();
  await db
    .prepare(
      `INSERT INTO connection_requests (
        id,
        sender_id,
        receiver_id,
        status,
        message,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))`
    )
    .bind(id, senderId, receiverId, 'pending', message || null)
    .run();
  return id;
}

export async function getConnectionRequestById(db, requestId) {
  return db.prepare('SELECT * FROM connection_requests WHERE id = ?')
    .bind(requestId)
    .first();
}

export async function getSentConnectionRequests(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT
        cr.id,
        cr.receiver_id,
        cr.status,
        cr.created_at,
        cr.expires_at,
        u.full_name,
        u.age,
        u.gender
      FROM connection_requests cr
      JOIN users u ON cr.receiver_id = u.id
      WHERE cr.sender_id = ?
      ORDER BY cr.created_at DESC`
    )
    .bind(userId)
    .all();
  return results;
}

export async function getReceivedConnectionRequests(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT
        cr.id,
        cr.sender_id,
        cr.status,
        cr.message,
        cr.created_at,
        cr.expires_at,
        u.full_name,
        u.age,
        u.gender
      FROM connection_requests cr
      JOIN users u ON cr.sender_id = u.id
      WHERE cr.receiver_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC`
    )
    .bind(userId)
    .all();
  return results;
}

export async function getConnections(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT
        c.id,
        c.user_id_1,
        c.user_id_2,
        c.created_at,
        u.id AS other_user_id,
        u.full_name,
        u.age,
        u.gender,
        u.location_city
      FROM connections c
      JOIN users u ON u.id = CASE
        WHEN c.user_id_1 = ? THEN c.user_id_2
        ELSE c.user_id_1
      END
      WHERE (c.user_id_1 = ? OR c.user_id_2 = ?) AND c.status = 'active'
      ORDER BY c.created_at DESC`
    )
    .bind(userId, userId, userId)
    .all();
  return results;
}

export async function updateConnectionRequestStatus(db, requestId, status, respondedAt) {
  await db
    .prepare(
      `UPDATE connection_requests
       SET status = ?, responded_at = ?
       WHERE id = ?`
    )
    .bind(status, respondedAt || new Date().toISOString(), requestId)
    .run();
}

export async function createConnection(db, userId1, userId2) {
  const id = generateId();
  await db
    .prepare(
      'INSERT INTO connections (id, user_id_1, user_id_2, status) VALUES (?, ?, ?, ?)'
    )
    .bind(id, userId1, userId2, 'active')
    .run();
  return id;
}

export async function checkExistingConnection(db, userId1, userId2) {
  const row = await db
    .prepare(
      `SELECT 1 FROM connections
       WHERE status = 'active'
         AND ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?))
       UNION ALL
       SELECT 1 FROM connection_requests
       WHERE status = 'pending'
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       LIMIT 1`
    )
    .bind(userId1, userId2, userId2, userId1, userId1, userId2, userId2, userId1)
    .first();
  return Boolean(row);
}

export async function expireOldRequests(db) {
  await db
    .prepare(
      `UPDATE connection_requests
       SET status = 'expired', responded_at = CURRENT_TIMESTAMP
       WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP`
    )
    .run();
}

export async function createMessage(db, messageData) {
  const { id, connection_id, sender_id, content, status, created_at } = messageData;
  await db
    .prepare(
      `INSERT INTO messages (
        id,
        connection_id,
        sender_id,
        content,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      connection_id,
      sender_id,
      content,
      status || 'sent',
      created_at || new Date().toISOString()
    )
    .run();
}

export async function getMessagesByConnection(db, connectionId, limit, offset, beforeTimestamp) {
  const conditions = ['messages.connection_id = ?'];
  const params = [connectionId];

  if (beforeTimestamp) {
    conditions.push('messages.created_at < ?');
    params.push(beforeTimestamp);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const { results } = await db
    .prepare(
      `SELECT
        messages.id,
        messages.connection_id,
        messages.sender_id,
        messages.content,
        messages.status,
        messages.created_at,
        users.full_name AS sender_name
      FROM messages
      JOIN users ON users.id = messages.sender_id
      ${whereClause}
      ORDER BY messages.created_at DESC
      LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  return results;
}

export async function updateMessageStatus(db, messageId, status) {
  await db
    .prepare('UPDATE messages SET status = ? WHERE id = ?')
    .bind(status, messageId)
    .run();
}

export async function updateMultipleMessageStatus(db, messageIds, status) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return;
  }
  const placeholders = messageIds.map(() => '?').join(', ');
  const statusCondition = status === 'delivered' ? " AND status = 'sent'" : '';
  await db
    .prepare(
      `UPDATE messages
       SET status = ?
       WHERE id IN (${placeholders})${statusCondition}`
    )
    .bind(status, ...messageIds)
    .run();
}

export async function getUnreadCounts(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT connection_id, COUNT(*) AS unread_count
       FROM messages
       WHERE status != 'read' AND sender_id != ?
       GROUP BY connection_id`
    )
    .bind(userId)
    .all();
  return results;
}

export async function getConnectionById(db, connectionId) {
  return db.prepare('SELECT * FROM connections WHERE id = ?')
    .bind(connectionId)
    .first();
}

export async function verifyUserInConnection(db, connectionId, userId) {
  const row = await db
    .prepare(
      `SELECT 1 FROM connections
       WHERE id = ? AND status = 'active' AND (user_id_1 = ? OR user_id_2 = ?)`
    )
    .bind(connectionId, userId, userId)
    .first();
  return Boolean(row);
}

export async function getMessageIdsForUser(db, userId, messageIds) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return [];
  }
  const placeholders = messageIds.map(() => '?').join(', ');
  const { results } = await db
    .prepare(
      `SELECT messages.id
       FROM messages
       JOIN connections ON connections.id = messages.connection_id
       WHERE messages.id IN (${placeholders})
         AND connections.status = 'active'
         AND (connections.user_id_1 = ? OR connections.user_id_2 = ?)`
    )
    .bind(...messageIds, userId, userId)
    .all();

  return results.map((row) => row.id);
}

export async function getReferenceData(db) {
  const religions = await db
    .prepare('SELECT id, name FROM religions WHERE is_active = 1')
    .all();
  const races = await db.prepare('SELECT id, name FROM races WHERE is_active = 1').all();
  const education_levels = await db
    .prepare('SELECT id, name FROM education_levels WHERE is_active = 1')
    .all();
  const cities = await db.prepare('SELECT id, name, province FROM cities').all();

  return {
    religions: religions.results,
    races: races.results,
    education_levels: education_levels.results,
    cities: cities.results,
  };
}

export async function updateUserProfile(db, userId, profileData) {
  await db
    .prepare(
      `UPDATE users SET
        age = ?,
        gender = ?,
        nationality = ?,
        religion = ?,
        race = ?,
        education = ?,
        has_kids = ?,
        num_kids = ?,
        smoker = ?,
        drinks_alcohol = ?,
        location_city = ?,
        location_province = ?,
        profile_complete = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    )
    .bind(
      profileData.age,
      profileData.gender,
      profileData.nationality,
      profileData.religion,
      profileData.race,
      profileData.education,
      profileData.has_kids ? 1 : 0,
      profileData.num_kids,
      profileData.smoker ? 1 : 0,
      profileData.drinks_alcohol ? 1 : 0,
      profileData.location_city,
      profileData.location_province,
      userId
    )
    .run();
}
