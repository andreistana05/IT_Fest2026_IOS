import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { saveUserProfile } from './firebase';

/**
 * Requests push notification permissions, obtains the Expo push token,
 * and saves it to the user's Firestore profile so the Android app can
 * send fall alerts to this device.
 *
 * Safe to call multiple times — only saves when the token changes.
 */
export async function registerPushToken(uid: string): Promise<string | null> {
  // Physical device required — simulators can't receive push notifications
  if (!Device.isDevice) {
    console.log('[push] Skipping — not a physical device');
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fall-alerts', {
      name: 'Fall Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e74c3c',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[push] No EAS projectId found in app config');
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  console.log('[push] Expo push token:', token);

  // Persist to Firestore so the Android app can look it up
  await saveUserProfile({ uid, fcmToken: token });

  return token;
}
