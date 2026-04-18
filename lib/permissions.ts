import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";

export type PermissionState = "granted" | "denied" | "undetermined";

/** Check the current notification permission status without prompting. */
export async function getNotificationStatus(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/**
 * Request notification permissions. Returns the final status.
 * If the user previously denied, iOS won't re-prompt — the only
 * option is to send them to Settings.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return "granted";

  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionState;
}

/**
 * Show an alert explaining that notification permissions are needed
 * and offer to open Settings. Call this when the user tries to create
 * or enable an alarm but permissions are denied.
 */
export function promptOpenSettings(context: "alarm" | "notification") {
  const message =
    context === "alarm"
      ? "Que needs notification access to fire your alarm. Open Settings to allow notifications."
      : "Turn on notifications in Settings so you never miss your morning session.";

  Alert.alert("Notifications Off", message, [
    { text: "Not Now", style: "cancel" },
    {
      text: "Open Settings",
      onPress: () => {
        if (Platform.OS === "ios") {
          Linking.openURL("app-settings:");
        } else {
          Linking.openSettings();
        }
      },
    },
  ]);
}

/**
 * Ensure notification permissions are granted before proceeding.
 * Returns true if granted, false if denied (and shows a prompt to
 * open Settings on denial).
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const status = await requestNotificationPermission();
  if (status === "granted") return true;

  promptOpenSettings("alarm");
  return false;
}
