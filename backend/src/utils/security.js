export const logSecurityEvent = async (db, event) => {
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO security_events (id, user_id, event_type, ip_address, user_agent, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    id,
    event.user_id || null,
    event.event_type,
    event.ip_address || null,
    event.user_agent || null,
    event.metadata ? JSON.stringify(event.metadata) : null
  ).run();
};

export const getSecurityEvents = async (db, filters = {}) => {
  let query = 'SELECT * FROM security_events WHERE 1=1';
  const params = [];

  if (filters.user_id) {
    query += ' AND user_id = ?';
    params.push(filters.user_id);
  }

  if (filters.event_type) {
    query += ' AND event_type = ?';
    params.push(filters.event_type);
  }

  if (filters.since) {
    query += ' AND created_at >= ?';
    params.push(filters.since);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(filters.limit || 100);

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
};
