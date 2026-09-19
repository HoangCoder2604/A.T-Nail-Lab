/* A.T Nail Lab - Firebase Cloud Messaging service worker.
   Firebase Web config is public client configuration, not a server secret. */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAJq2HoZDLNw5Fc3Pth5DxFMM3neB-4BHM',
  authDomain: 'at-nail-lab.firebaseapp.com',
  projectId: 'at-nail-lab',
  storageBucket: 'at-nail-lab.firebasestorage.app',
  messagingSenderId: '976323724304',
  appId: '1:976323724304:web:ae0a2f33bbd1b7d1dd7695',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || 'A.T Nail Lab • Có lịch mới';

  self.registration.showNotification(title, {
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
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification?.data?.url || '/admin', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return clients.openWindow(targetUrl);
  })());
});
