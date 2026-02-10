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
        u.location_city,
        s.id AS story_id,
        CASE
          WHEN u.updated_at >= datetime('now', '-10 minutes') THEN 1
          ELSE 0
        END AS is_online
      FROM connections c
      JOIN users u ON u.id = CASE
        WHEN c.user_id_1 = ? THEN c.user_id_2
        ELSE c.user_id_1
      END
      LEFT JOIN stories s
        ON s.user_id = u.id AND s.is_active = 1
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
  const timestamp = new Date().toISOString();
  console.log(`[DB] ${timestamp} Verifying user ${userId} for connection ${connectionId}`);
  
    const query = `SELECT 
      c.id, 
      c.status, 
      c.user_id_1, 
      c.user_id_2,
      u1.full_name as user1_name,
      u2.full_name as user2_name
    FROM connections c
    LEFT JOIN users u1 ON c.user_id_1 = u1.id
    LEFT JOIN users u2 ON c.user_id_2 = u2.id
    WHERE c.id = ?`;
  
  console.log(`[DB] ${timestamp} Executing query: ${query}`);
  console.log(`[DB] ${timestamp} Query parameters: [${connectionId}]`);
  
  try {
    const connection = await db.prepare(query).bind(connectionId).first();
    
      if (!connection) {
        // Check live rooms as a fallback (used for live chat streams)
        const liveRoom = await db
          .prepare(
            `SELECT
              lr.id,
              lr.host_id,
              lr.status,
              u.full_name as host_name
            FROM live_rooms lr
            LEFT JOIN users u ON u.id = lr.host_id
            WHERE lr.id = ?`
          )
          .bind(connectionId)
          .first();

        if (!liveRoom || liveRoom.status !== 'live') {
          console.log(`[DB] ${timestamp} Connection not found: ${connectionId}`);
          return { 
            valid: false, 
            reason: 'CONNECTION_NOT_FOUND',
            message: 'Connection does not exist in database'
          };
        }

        const participant = await db
          .prepare(
            `SELECT 1 FROM live_room_participants
             WHERE room_id = ? AND user_id = ? AND left_at IS NULL`
          )
          .bind(connectionId, userId)
          .first();

        if (!participant && liveRoom.host_id !== userId) {
          console.log(`[DB] ${timestamp} User ${userId} not in live room ${connectionId}`);
          return {
            valid: false,
            reason: 'USER_NOT_IN_CONNECTION',
            message: 'User is not a participant in this live room'
          };
        }

        console.log(`[DB] ${timestamp} Live room verification successful`);
        return {
          valid: true,
          connection: {
            id: liveRoom.id,
            user_id_1: liveRoom.host_id,
            user_id_2: userId,
            user1_name: liveRoom.host_name,
            user2_name: 'Viewer'
          }
        };
      }
    
    if (connection.status !== 'active') {
      console.log(`[DB] ${timestamp} Connection inactive: ${connectionId}, status: ${connection.status}`);
      return { 
        valid: false, 
        reason: 'CONNECTION_INACTIVE',
        message: `Connection status is ${connection.status}`
      };
    }
    
    const isUserInConnection = connection.user_id_1 === userId || connection.user_id_2 === userId;
    
    if (!isUserInConnection) {
      console.log(`[DB] ${timestamp} User ${userId} not in connection ${connectionId}`);
      console.log(`[DB] ${timestamp} Connection users: ${connection.user_id_1}, ${connection.user_id_2}`);
      return { 
        valid: false, 
        reason: 'USER_NOT_IN_CONNECTION',
        message: 'User is not a participant in this connection'
      };
    }
    
    console.log(`[DB] ${timestamp} Connection verification successful`);
    return { 
      valid: true, 
      connection: {
        id: connection.id,
        user_id_1: connection.user_id_1,
        user_id_2: connection.user_id_2,
        user1_name: connection.user1_name,
        user2_name: connection.user2_name
      }
    };
  } catch (error) {
    console.error(`[DB] ${timestamp} Database error:`, error.message);
    return { 
      valid: false, 
      reason: 'DATABASE_ERROR',
      message: error.message
    };
  }
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
  const cities = await db.prepare('SELECT id, name, province FROM cities').all();

  return {
    religions: religions.results,
    races: races.results,
    cities: cities.results,
  };
}

export async function updateUserProfile(db, userId, profileData) {
  const timestamp = new Date().toISOString();
  console.log(`[DB] ${timestamp} Updating profile for user: ${userId}`);
  
  const {
    age, gender, nationality, religion, race,
    has_kids, num_kids, smoker, drinks_alcohol,
    location_city, location_province,
    seeking_gender, seeking_age_min, seeking_age_max, seeking_races
  } = profileData;

  // Log sanitized profile data
  console.log(`[DB] ${timestamp} Profile data:`, {
    age, gender, nationality, religion, race,
    has_kids, num_kids, smoker, drinks_alcohol,
    location_city, location_province, seeking_gender,
    seeking_age_min, seeking_age_max, seeking_races
  });

  // Serialize seeking_races array to JSON string
  const seekingRacesJson = seeking_races ? JSON.stringify(seeking_races) : null;

  try {
    await db
      .prepare(
        `UPDATE users SET
          age = ?,
          gender = ?,
          nationality = ?,
          religion = ?,
          race = ?,
          has_kids = ?,
          num_kids = ?,
          smoker = ?,
          drinks_alcohol = ?,
          location_city = ?,
          location_province = ?,
          seeking_gender = ?,
          seeking_age_min = ?,
          seeking_age_max = ?,
          seeking_races = ?,
          profile_complete = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      )
      .bind(
        age,
        gender,
        nationality,
        religion,
        race,
        has_kids ? 1 : 0,
        num_kids,
        smoker ? 1 : 0,
        drinks_alcohol ? 1 : 0,
        location_city,
        location_province,
        seeking_gender || null,
        seeking_age_min ?? null,
        seeking_age_max ?? null,
        seekingRacesJson,
        userId
      )
      .run();
  } catch (error) {
    console.error(`[DB] ${timestamp} Profile update failed for user ${userId}:`, error.message);
    
    if (error.message.includes('CHECK constraint failed') || error.message.includes('constraint failed')) {
      // Extract field name from error message if possible
      let field = 'unknown';
      if (error.message.includes('religion')) field = 'religion';
      else if (error.message.includes('race')) field = 'race';
      else if (error.message.includes('gender')) field = 'gender';
      
      throw {
        type: 'CONSTRAINT_VIOLATION',
        field,
        message: error.message,
        originalError: error
      };
    }
    
    throw {
      type: 'DATABASE_ERROR',
      message: error.message,
      originalError: error
    };
  }
}

export async function getUserPreferences(db, userId) {
  const user = await getUserById(db, userId);
  if (!user) return null;

  return {
    seeking_gender: user.seeking_gender,
    seeking_age_min: user.seeking_age_min,
    seeking_age_max: user.seeking_age_max,
    seeking_races: user.seeking_races ? JSON.parse(user.seeking_races) : [],
  };
}

export async function updateUserBasics(db, userId, basics) {
  const { age, gender, seeking_gender } = basics;
  await db
    .prepare(
      `UPDATE users SET
        age = ?,
        gender = ?,
        seeking_gender = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    )
    .bind(age, gender, seeking_gender, userId)
    .run();
}

export async function updateUserPartial(db, userId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return;
  }

  const columns = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value);

  await db
    .prepare(
      `UPDATE users SET ${columns}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .bind(...values, userId)
    .run();
}

export async function savePushSubscription(db, userId, subscription, userAgent = null) {
  const id = generateId();
  await db
    .prepare(
      `INSERT INTO push_subscriptions
        (id, user_id, endpoint, p256dh, auth, expiration_time, user_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, endpoint) DO UPDATE SET
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         expiration_time = excluded.expiration_time,
         user_agent = excluded.user_agent,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      id,
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      subscription.expirationTime || null,
      userAgent
    )
    .run();
}

export async function removePushSubscription(db, userId, endpoint) {
  await db
    .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .bind(userId, endpoint)
    .run();
}

export async function getPushSubscriptionsByUser(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT id, endpoint, p256dh, auth, expiration_time
       FROM push_subscriptions
       WHERE user_id = ?`
    )
    .bind(userId)
    .all();
  return results || [];
}
