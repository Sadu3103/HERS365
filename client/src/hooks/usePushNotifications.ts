import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function registerPushNotifications(authToken: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();

  await PushNotifications.addListener('registration', async (token) => {
    try {
      await fetch('/api/push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: token.value, platform: 'ios' }),
      });
    } catch {
      // Non-fatal: push token registration failure does not break the app
    }
  });

  await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
    // Notification received while app is in foreground — badge is shown via plugin config
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const route = (action.notification.data as Record<string, string>)?.route;
    if (route) window.location.href = route;
  });
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
}
