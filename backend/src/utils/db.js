export function getDb(c) {
  return c.env.DB;
}

export function generateId() {
  return crypto.randomUUID();
}
