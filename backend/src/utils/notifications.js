import { generateId } from './db.js';
import { buildNotificationUrl, sendPushToUser } from './push.js';

export const createNotification = async (db, { user_id, type, title, message, data = null }, env) => {
  const id = generateId();
  const payloadData = data || {};
  await db
    .prepare('INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user_id, type, title, message, payloadData ? JSON.stringify(payloadData) : null)
    .run();

  if (env) {
    const notificationType = payloadData.notification_type || type;
    const url = buildNotificationUrl(notificationType, payloadData);
    await sendPushToUser(
      env,
      db,
      user_id,
      {
        title,
        body: message,
        icon: '/icon-192.png',
        data: { url, notificationId: id, notificationType }
      },
      { urgency: notificationType === 'video_call_request' ? 'high' : 'normal' }
    );
  }

  return id;
};
