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
       SET status = ?, updated_at = CURRENT_TIMESTAMP
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
