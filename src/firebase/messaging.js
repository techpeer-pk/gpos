import { messaging } from './config';
import { getToken, onMessage } from 'firebase/messaging';
import FirestoreService from './firestore-multi-branch';

export const requestNotificationPermission = async (businessId, userId) => {
    try {
        if (!('serviceWorker' in navigator)) {
            console.error('Service Workers are not supported in this browser.');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.error('Notification permission not granted:', permission);
            return null;
        }

        // Explicitly register and wait for service worker to be ready
        // This is more robust than letting Firebase handle it implicitly
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered with scope:', registration.scope);

        const token = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('🚀 FCM Token retrieved successfully:', token);
            await FirestoreService.saveUserFcmToken(businessId, userId, token);
            return token;
        } else {
            console.error('No registration token available. Request permission to generate one.');
        }
    } catch (error) {
        console.error('❌ FCM Error:', error.message);
        if (error.code === 'messaging/permission-blocked') {
            console.error('Please allow notifications in your browser settings.');
        }
    }
    return null;
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
