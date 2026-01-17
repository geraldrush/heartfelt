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
