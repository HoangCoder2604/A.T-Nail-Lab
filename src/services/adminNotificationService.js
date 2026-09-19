import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging';
import { firebaseApp } from '../lib/firebase';
import { getAccessToken } from './bookingService';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const SERVICE_WORKER_URL = '/firebase-messaging-sw.js';

async function messagingSupported() {
  if (!firebaseApp || typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

async function getMessagingRegistration() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Trình duyệt này không hỗ trợ Service Worker.');
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
}

async function registerTokenOnServer(token) {
  const idToken = await getAccessToken();
  if (!idToken) throw new Error('Phiên đăng nhập admin đã hết hạn.');

  const response = await fetch('/api/admin-push-register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      token,
      userAgent: navigator.userAgent,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Không đăng ký được thiết bị nhận thông báo.');
  }

  return result;
}

export async function getAdminPushState() {
  const supported = await messagingSupported();
  if (!supported) {
    return { state: 'unsupported', label: 'Trình duyệt không hỗ trợ push' };
  }

  if (!VAPID_KEY) {
    return { state: 'missing-vapid', label: 'Chưa cấu hình Web Push key' };
  }

  if (Notification.permission === 'denied') {
    return { state: 'denied', label: 'Thông báo đang bị chặn' };
  }

  if (Notification.permission === 'granted') {
    return { state: 'granted', label: 'Thông báo đã bật' };
  }

  return { state: 'default', label: 'Bật thông báo đẩy' };
}

export async function enableAdminPushNotifications() {
  const supported = await messagingSupported();
  if (!supported) {
    throw new Error('Trình duyệt hiện tại không hỗ trợ Firebase Web Push.');
  }
  if (!VAPID_KEY) {
    throw new Error('Chưa có VITE_FIREBASE_VAPID_KEY. Hãy tạo Web Push certificate trong Firebase Cloud Messaging.');
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Bạn chưa cho phép website gửi thông báo.');
  }

  const registration = await getMessagingRegistration();
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('Firebase không trả về registration token cho thiết bị này.');
  }

  await registerTokenOnServer(token);
  return { state: 'granted', label: 'Thông báo đã bật', token };
}

export async function syncAdminPushTokenIfAllowed() {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return null;
  return enableAdminPushNotifications();
}

export async function subscribeForegroundPush(onPayload) {
  const supported = await messagingSupported();
  if (!supported || !VAPID_KEY) return () => {};

  const messaging = getMessaging(firebaseApp);
  return onMessage(messaging, (payload) => {
    onPayload?.(payload);
  });
}

export async function showForegroundPush(payload) {
  if (Notification.permission !== 'granted') return;
  const registration = await getMessagingRegistration();
  const data = payload?.data || {};

  await registration.showNotification(data.title || 'A.T Nail Lab • Có lịch mới', {
    body: data.body || 'Có khách vừa đặt lịch từ website.',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: data.bookingCode ? `booking-${data.bookingCode}` : 'at-nail-booking',
    renotify: true,
    data: {
      url: data.url || '/admin',
      bookingCode: data.bookingCode || '',
    },
  });
}
