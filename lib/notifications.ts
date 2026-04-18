import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import { useEffect, useState, useCallback } from "react";

// ─── Notification handler (foreground behavior) ─────────────────────────────
// When a notification arrives while the app is open, show it as a banner
// and play the sound. This is critical for alarm UX.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Android channel ────────────────────────────────────────────────────────
// Android requires a notification channel for any notification to appear.
// We create one "Alarms" channel with max importance so alarms break through
// Do Not Disturb. This runs once and is idempotent.
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

// ─── Permission helpers ─────────────────────────────────────────────────────

export type PermissionStatus = "granted" | "denied" | "undetermined";

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/**
 * Request notification permissions from the OS.
 *
 * Returns the resulting status. On iOS, the system dialog only appears once —
 * if the user previously denied, this returns "denied" immediately and the
 * caller should guide them to Settings.
 */
export async function requestPermissions(): Promise<PermissionStatus> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return "granted";

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
    },
  });

  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/**
 * Show a pre-permission prompt explaining why Que needs notifications,
 * then request the actual OS permission. This "double-prompt" pattern
 * avoids burning the one-shot iOS dialog on a cold ask.
 *
 * Returns the final permission status.
 */
export function requestPermissionsGracefully(): Promise<PermissionStatus> {
  return new Promise((resolve) => {
    Alert.alert(
      "Stay on schedule",
      "Que needs notifications to wake you up on time. Without them, your alarms won't fire.",
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => resolve("denied"),
        },
        {
          text: "Allow",
          onPress: async () => {
            const status = await requestPermissions();
            resolve(status);
          },
        },
      ],
    );
  });
}

/**
 * When permissions have been permanently denied, guide the user to the
 * system Settings app so they can re-enable notifications manually.
 */
export function promptOpenSettings(): void {
  Alert.alert(
    "Notifications are off",
    "Your alarms need notifications to work. Open Settings and turn on notifications for Que.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          Linking.openSettings();
        },
      },
    ],
  );
}

/**
 * Ensure permissions are granted before an alarm-related action.
 * If undetermined, shows the graceful prompt. If denied, guides to Settings.
 * Returns true if permissions are granted after the flow.
 */
export async function ensurePermissions(): Promise<boolean> {
  const status = await getPermissionStatus();

  if (status === "granted") return true;

  if (status === "undetermined") {
    const result = await requestPermissionsGracefully();
    return result === "granted";
  }

  // Denied — guide to system settings
  promptOpenSettings();
  return false;
}

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Call once at app startup (after auth). Sets up the Android channel.
 * Does NOT prompt for permissions — that happens contextually when the
 * user interacts with alarms or toggles notifications in Settings.
 */
export async function initNotifications(): Promise<void> {
  await ensureAndroidChannel();
}

// ─── React hook ─────────────────────────────────────────────────────────────

/**
 * Hook that tracks the current notification permission status.
 * Re-checks when the app returns to foreground (user may have changed
 * the setting in the system Settings app).
 */
export function useNotificationPermission() {
  const [status, setStatus] = useState<PermissionStatus>("undetermined");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getPermissionStatus();
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
