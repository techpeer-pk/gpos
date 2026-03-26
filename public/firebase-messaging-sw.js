// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyDUu6W2bRv2ZA-eMkGTjJGvdDv-KuiGEig",
  authDomain: "gpos-dev-cx.firebaseapp.com",
  projectId: "gpos-dev-cx",
  storageBucket: "gpos-dev-cx.firebasestorage.app",
  messagingSenderId: "357001539118",
  appId: "1:357001539118:web:6ec46a9e6d1eb5d07139bf"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
