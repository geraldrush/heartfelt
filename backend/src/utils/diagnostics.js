export async function logDiagnostics(db, { category, message, data }) {
  if (!db) return;
  try {
    await db
      .prepare(
        `INSERT INTO diagnostics_log (id, category, message, data, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(crypto.randomUUID(), category, message, data ? JSON.stringify(data) : null)
      .run();
  } catch (error) {
    // Never block main flow on diagnostics logging
    console.error('[Diagnostics] Failed to write log', error?.message);
  }
}
