import { pushGate, type PushStatus } from './push-rules';
import { waitForPushWorker } from './push-worker';

export async function enablePush(): Promise<{ status: PushStatus; token?: string }> {
  const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'];
  const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'];
  const config = {
    apiKey: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'],
    projectId: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'],
    appId,
    messagingSenderId: appId?.split(':')[1] ?? '',
  };
  const configured = Boolean(config.apiKey && config.projectId && appId && vapidKey && config.messagingSenderId);
  const gate = pushGate(configured, 'Notification' in window && 'serviceWorker' in navigator, window.top !== window.self);
  if (gate) return { status: gate };
  // Request permission directly within the button's user gesture, before SDK loading.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' };
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return { status: 'unsupported' };
  const { initializeApp, getApps } = await import('firebase/app');
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(config).toString()}`);
  await waitForPushWorker(registration);
  const app = getApps().find(a => a.name === 'nexa-push') ?? initializeApp(config, 'nexa-push');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
  return token ? { status: 'registered', token } : { status: 'denied' };
}