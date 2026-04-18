import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { Database } from "./database.types";

type Alarm = Database["public"]["Tables"]["alarms"]["Row"];

// ─── Foreground notification behavior ───────────────────────────────────────
// When an alarm notification fires while the app is in the foreground,
// show the alert and play the default sound so the user still notices it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Android channel ────────────────────────────────────────────────────────
// Android requires a channel before any notification can appear. MAX importance
// ensures the alarm breaks through Do Not Disturb and shows a heads-up banner.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("alarms", {
    name: "Alarms",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

// ─── Schedule / cancel ──────────────────────────────────────────────────────

/**
 * Schedule a local notification for the given alarm.
 * Uses the alarm ID as the notification identifier so it can be
 * cancelled or rescheduled without duplication.
 */
export async function scheduleAlarmNotification(alarm: Alarm): Promise<void> {
  if (!alarm.enabled) return;

  const fireDate = new Date(alarm.next_fire_at);
  if (fireDate.getTime() <= Date.now()) return;

  // Cancel any existing notification for this alarm first
  await cancelAlarmNotification(alarm.id);
  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: alarm.id,
    content: {
      title: alarm.label || "Alarm",
      body: "Time to start your session.",
      sound: "default",
      data: {
        alarmId: alarm.id,
        sessionId: alarm.mantra_id,
      },
      ...(Platform.OS === "android" ? { channelId: "alarms" } : {}),
    },
    trigger:
      Platform.OS === "android"
        ? { channelId: "alarms", date: fireDate }
        : fireDate,
  });
}

/**
 * Cancel the scheduled notification for an alarm.
 */
export async function cancelAlarmNotification(alarmId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(alarmId);
}

/**
 * Cancel all scheduled alarm notifications (e.g. on sign-out).
 */
export async function cancelAllAlarmNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Reschedule notifications for all enabled alarms.
 * Useful after app restart or when the alarm list is first loaded.
 */
export async function syncAllAlarmNotifications(alarms: Alarm[]): Promise<void> {
  // Cancel everything first to avoid orphan notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const alarm of alarms) {
    if (alarm.enabled) {
      await scheduleAlarmNotification(alarm);
    }
  }
}

// ─── Notification response handler ──────────────────────────────────────────
// When the user taps an alarm notification, navigate to the player
// with the correct session so audio starts immediately.

let responseSubscription: Notifications.Subscription | null = null;

/**
 * Register a listener for notification interactions (taps).
 * Call once at app startup. Returns a cleanup function.
 */
export function registerAlarmResponseHandler(): () => void {
  if (responseSubscription) {
    responseSubscription.remove();
  }

  responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      const sessionId = data?.sessionId as string | undefined;
      if (sessionId) {
        router.push(`/player?id=${sessionId}`);
      }
    },
  );

  return () => {
    responseSubscription?.remove();
    responseSubscription = null;
  };
}

/**
 * Check if the app was opened from a notification (cold start).
 * If so, navigate to the player with the session from that notification.
 */
export async function handleInitialNotification(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;

  const data = response.notification.request.content.data;
  const sessionId = data?.sessionId as string | undefined;
  if (sessionId) {
    // Small delay to let the navigation tree mount before pushing
    setTimeout(() => {
      router.push(`/player?id=${sessionId}`);
    }, 500);
  }
}
