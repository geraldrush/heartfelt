import { apiClient } from './api.js';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  return navigator.serviceWorker.register('/sw.js');
};

export const subscribeToPush = async (publicKey) => {
  if (!publicKey) {
    return null;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }
  const appServerKey = urlBase64ToUint8Array(publicKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: appServerKey
  });
};

export const sendSubscriptionToServer = async (subscription) => {
  if (!subscription) return;
  const payload = subscription.toJSON();
  await apiClient.post('/api/notifications/push/subscribe', payload);
};

export const ensurePushSubscription = async (publicKey) => {
  if (Notification.permission === 'denied') {
    return null;
  }
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }
  }
  await registerServiceWorker();
  const subscription = await subscribeToPush(publicKey);
  if (subscription) {
    await sendSubscriptionToServer(subscription);
  }
  return subscription;
};
