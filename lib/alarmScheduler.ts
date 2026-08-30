/**
 * alarmScheduler.ts
 *
 * Handles all OS-level alarm scheduling via expo-notifications local notifications.
 *
 * APPROACH: Local notifications with scheduleNotificationAsync.
 * - iOS: interruptionLevel 'timeSensitive' — bypasses Focus modes (not silent/DND).
 * - Android: HIGH_IMPORTANCE channel with bypassDnd:true.
 * - No backend required; works when app is killed.
 *
 * LIMITATION (iOS): Without the Critical Alerts entitlement, alarms are silenced
 * by the mute switch. See docs/alarm-audit.md § "Critical Alerts" for the path
 * to fix this. All third-party alarm apps (Calm, Headspace, etc.) have this same
 * limitation until they obtain the entitlement from Apple.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ─── Types ────────────────────────────────────────────────
export interface SchedulableAlarm {
  id: string;
  label: string;
  next_fire_at: string;   // ISO string
  mantra_id: string;
  enabled: boolean;
  repeat_days: number[];  // 0=Sun … 6=Sat, empty=no repeat
}

// ─── Android channel ─────────────────────────────────────
// Must be created before scheduling on Android. Safe to call multiple times.
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("que-alarms", {
    name: "Que Alarms",
    importance: Notifications.AndroidImportance.MAX,
    // bypassDnd: true requires the app to hold MANAGE_MEDIA or be a system alarm app.
    // On Android 13+ the user must explicitly allow this in notification settings.
    // We set it optimistically — it has no effect if the user hasn't granted it.
    bypassDnd: true,
    vibrationPattern: [0, 500, 200, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: "default",
  });
}

// ─── Permission request ───────────────────────────────────
export async function requestAlarmPermissions(): Promise<boolean> {
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      // timeSensitive — allows notifications to break through Focus modes.
      // Does NOT require special entitlement.
      allowProvisional: false,
    },
  });

  return status === "granted";
}

// ─── Schedule one alarm ───────────────────────────────────
/**
 * Schedules a local notification for the alarm's next_fire_at time.
 * Uses the alarm's id as the notification identifier so we can cancel it later.
 * Returns the notification identifier (== alarm.id), or null on failure.
 */
export async function scheduleAlarm(alarm: SchedulableAlarm): Promise<string | null> {
  if (!alarm.enabled) return null;

  const fireDate = new Date(alarm.next_fire_at);
  if (fireDate.getTime() <= Date.now()) {
    // Already in the past — skip. edit-alarm.tsx rolls the date forward, but
    // guard here as a safety net.
    console.warn(`[alarmScheduler] Skipping past alarm: ${alarm.label} at ${alarm.next_fire_at}`);
    return null;
  }

  // Cancel any existing notification for this alarm first (handles edits/reschedules)
  await cancelAlarm(alarm.id);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: alarm.id,  // use alarmId as notif identifier for easy cancellation
      content: {
        title: "⏰ " + (alarm.label || "Your alarm"),
        body: "Tap to begin your session.",
        sound: "default",
        // Carry the sessionId so the tap handler can open the right player screen.
        data: {
          alarmId: alarm.id,
          sessionId: alarm.mantra_id,
          type: "alarm",
        },
        // iOS 15+: Time Sensitive interruption level breaks through Focus modes
        // (Screen Time, Do Not Disturb profiles) without a special entitlement.
        // Will NOT bypass the hardware mute switch — Critical Alerts needed for that.
        ...(Platform.OS === "ios" && {
          interruptionLevel: "timeSensitive" as const,
        }),
      },
      // SDK 53+: date triggers are explicit typed objects
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });

    console.log(`[alarmScheduler] Scheduled "${alarm.label}" at ${fireDate.toISOString()} id=${id}`);
    return id;
  } catch (err) {
    console.error("[alarmScheduler] Failed to schedule alarm:", err);
    return null;
  }
}

// ─── Cancel one alarm ─────────────────────────────────────
export async function cancelAlarm(alarmId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(alarmId);
  } catch {
    // Notification may not exist — safe to ignore
  }
}

// ─── Cancel all alarms ────────────────────────────────────
export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Reschedule all from Supabase data ───────────────────
/**
 * Called on app start. Ensures the OS notification queue matches Supabase.
 * Cancels everything first, then reschedules all enabled alarms.
 */
export async function rescheduleAll(alarms: SchedulableAlarm[]): Promise<void> {
  // Cancel stale OS notifications that may no longer match the DB
  await cancelAllAlarms();
  const enabled = alarms.filter((a) => a.enabled);
  await Promise.all(enabled.map(scheduleAlarm));
  console.log(`[alarmScheduler] Rescheduled ${enabled.length}/${alarms.length} alarms`);
}

// ─── Roll an alarm's fire time forward ───────────────────
/**
 * Returns the next FUTURE occurrence of the alarm's wall-clock time as an
 * ISO string. Empty repeat_days means "every day" — an enabled morning
 * alarm keeps firing daily until it's switched off, like a bedside clock.
 *
 * This is the heart of the "alarm never fires" fix: scheduling with a
 * stale next_fire_at silently does nothing, so every schedule path must
 * roll forward first.
 */
export function rollForward(alarm: Pick<SchedulableAlarm, "next_fire_at" | "repeat_days">): string {
  const src = new Date(alarm.next_fire_at);
  const hour = src.getHours();
  const min = src.getMinutes();
  const days = alarm.repeat_days ?? [];

  const next = new Date();
  next.setHours(hour, min, 0, 0);
  for (let i = 0; i <= 7; i++) {
    const future = next.getTime() > Date.now();
    const dayOk = days.length === 0 || days.includes(next.getDay());
    if (future && dayOk) return next.toISOString();
    next.setDate(next.getDate() + 1);
    next.setHours(hour, min, 0, 0);
  }
  return next.toISOString();
}

// ─── Sync OS queue with alarm list ───────────────────────
/**
 * Call whenever the alarm list is loaded or the app comes to the
 * foreground. Heals stale fire times (persisting them via the supplied
 * callback) and makes the OS notification queue match: every enabled
 * alarm scheduled at a future time, every disabled one cancelled.
 */
export async function syncAlarms(
  alarms: SchedulableAlarm[],
  persist: (id: string, next_fire_at: string) => Promise<unknown>,
): Promise<void> {
  for (const alarm of alarms) {
    if (!alarm.enabled) {
      await cancelAlarm(alarm.id);
      continue;
    }
    let fireAt = alarm.next_fire_at;
    if (new Date(fireAt).getTime() <= Date.now()) {
      fireAt = rollForward(alarm);
      try { await persist(alarm.id, fireAt); } catch {}
    }
    await scheduleAlarm({ ...alarm, next_fire_at: fireAt });
  }
}

// ─── List pending notifications (debug) ──────────────────
export async function getPendingAlarms(): Promise<Notifications.NotificationRequest[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => n.content.data?.type === "alarm");
}

// ─── Repeat alarm helper ─────────────────────────────────
/**
 * After an alarm fires, call this to compute the next fire date for repeating alarms.
 * Returns null for non-repeating alarms (should be disabled after firing).
 */
export function getNextRepeatDate(alarm: SchedulableAlarm): Date | null {
  if (!alarm.repeat_days || alarm.repeat_days.length === 0) return null;

  const now = new Date();
  const firedDate = new Date(alarm.next_fire_at);
  const firedHour = firedDate.getHours();
  const firedMin = firedDate.getMinutes();

  // Find the next repeat day after today
  const todayDow = now.getDay(); // 0=Sun
  const sortedDays = [...alarm.repeat_days].sort((a, b) => a - b);

  for (let offset = 1; offset <= 7; offset++) {
    const checkDow = (todayDow + offset) % 7;
    if (sortedDays.includes(checkDow)) {
      const next = new Date();
      next.setDate(now.getDate() + offset);
      next.setHours(firedHour, firedMin, 0, 0);
      return next;
    }
  }

  return null;
}
