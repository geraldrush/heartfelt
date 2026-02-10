import { buildPushHTTPRequest } from '@pushforge/builder';
import { getPushSubscriptionsByUser, removePushSubscription } from './db.js';

const parseVapidKey = (raw) => {
  if (!raw) return null;
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return trimmed;
};

export const buildNotificationUrl = (notificationType, data) => {
  switch (notificationType) {
    case 'connection_request':
      return '/received-requests';
    case 'token_received':
      return '/tokens';
    case 'message_received':
      return data?.connection_id ? `/chat?connectionId=${data.connection_id}` : '/connections';
    case 'like':
      return '/stories';
    case 'follow':
      return '/connections';
    case 'video_call_request':
      return data?.connection_id ? `/chat?connectionId=${data.connection_id}&incoming=1` : '/connections';
    case 'live_invite':
      return data?.room_id ? `/live/${data.room_id}` : '/live';
    default:
      return '/notifications';
  }
};

export const sendPushToUser = async (env, db, userId, payload, { urgency = 'normal', ttl = 3600 } = {}) => {
  if (!env?.VAPID_PRIVATE_KEY || !env?.VAPID_PUBLIC_KEY || !env?.VAPID_SUBJECT) {
    return { sent: 0, skipped: 'missing_vapid' };
  }

  const privateKey = parseVapidKey(env.VAPID_PRIVATE_KEY);
  const publicKey = parseVapidKey(env.VAPID_PUBLIC_KEY);
  if (!privateKey || !publicKey) {
    return { sent: 0, skipped: 'invalid_vapid' };
  }

  const subscriptions = await getPushSubscriptionsByUser(db, userId);
  if (!subscriptions.length) {
    return { sent: 0, skipped: 'no_subscriptions' };
  }

  let sent = 0;
  await Promise.all(subscriptions.map(async (sub) => {
    try {
      const request = buildPushHTTPRequest(
        privateKey,
        {
          payload: JSON.stringify(payload),
          ttl,
          urgency
        },
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        env.VAPID_SUBJECT
      );

      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body
      });

      if (response.status === 404 || response.status === 410) {
        await removePushSubscription(db, userId, sub.endpoint);
        return;
      }

      if (response.ok) {
        sent += 1;
      }
    } catch (error) {
      console.error('[Push] Send error:', error?.message || error);
    }
  }));

  return { sent };
};
