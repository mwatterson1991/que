/**
 * alarmScheduler.ts
 *
 * Two ways to wake someone, chosen at schedule time:
 *
 * 1. iOS 26+: a REAL alarm through Apple's AlarmKit. It rings on the
 *    lock screen with a full-screen alert, breaks through the silent
 *    switch and every Focus, offers Stop and Snooze, and keeps repeating
 *    daily on its own. This is what the Clock app uses. The module is a
 *    silent no-op below iOS 26 and on Android, so the code below simply
 *    asks whether it is available.
 *
 * 2. Everywhere else: local notifications. A single notification is one
 *    short ding, so the fallback fires a burst of five, a minute apart,
 *    each carrying the app's own 28-second chime and Time Sensitive
 *    priority. Silent mode still mutes these (Apple allows only Critical
 *    Alerts through, and those need an entitlement), which is exactly
 *    why AlarmKit matters.
 *
 * In both cases lib/alarmLaunch.ts remembers what was scheduled, so when
 * the app comes to the foreground just after an alarm it opens that
 * alarm's session without needing a tap on anything.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { C } from "@/lib/tokens";
import { rememberScheduled, forgetScheduled } from "./alarmLaunch";

// ─── AlarmKit (optional at runtime) ──────────────────────
type AlarmKitModule = typeof import("react-native-ios-alarmkit").AlarmKit;
type Weekday = import("react-native-ios-alarmkit").Weekday;

let AlarmKit: AlarmKitModule | null = null;
try {
  AlarmKit = require("react-native-ios-alarmkit").AlarmKit as AlarmKitModule;
} catch {
  AlarmKit = null;
}

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** The bundled 28-second chime (see app.json → expo-notifications.sounds). */
const CHIME = "alarm-chime.wav";
/** Fallback notifications per alarm, one minute apart. */
const BURST = 5;
/** Snooze length for native alarms, in seconds. */
const SNOOZE_SEC = 9 * 60;

/** True when this device can set a real alarm. */
export function hasNativeAlarms(): boolean {
  try {
    return !!AlarmKit && AlarmKit.isSupported;
  } catch {
    return false;
  }
}

async function nativeAuthorized(): Promise<boolean> {
  if (!AlarmKit) return false;
  try {
    const state = await AlarmKit.getAuthorizationState();
    if (state === "authorized") return true;
    if (state === "denied") return false;
    return await AlarmKit.requestAuthorization();
  } catch {
    return false;
  }
}

// AlarmKit needs a UUID. Supabase rows have one; anything else is folded
// into a stable UUID shape so cancel() finds what schedule() created.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toUuid(id: string): string {
  if (UUID_RE.test(id)) return id.toLowerCase();
  let hex = "";
  let h = 0x811c9dc5;
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i) + round;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex += h.toString(16).padStart(8, "0");
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ─── Types ────────────────────────────────────────────────
export interface SchedulableAlarm {
  id: string;
  label: string;
  next_fire_at: string;   // ISO string
  mantra_id: string;
  enabled: boolean;
  repeat_days: number[];  // 0=Sun … 6=Sat, empty=every day
}

// ─── Android channel ─────────────────────────────────────
// Must be created before scheduling on Android. Safe to call multiple times.
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("que-alarms", {
    name: "Que Alarms",
    importance: Notifications.AndroidImportance.MAX,
    // bypassDnd takes effect only once the user allows it in the channel's
    // notification settings on Android 13+; harmless otherwise.
    bypassDnd: true,
    vibrationPattern: [0, 500, 200, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: CHIME,
  });
}

// ─── Permission request ───────────────────────────────────
export async function requestAlarmPermissions(): Promise<boolean> {
  await ensureAndroidChannel();

  // Native alarms first. If the device has them and says yes, that is the
  // permission that matters.
  if (hasNativeAlarms() && (await nativeAuthorized())) {
    // Still ask for notifications quietly; the foreground banner and the
    // burst fallback use them.
    Notifications.requestPermissionsAsync().catch(() => {});
    return true;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false, allowProvisional: false },
  });
  return status === "granted";
}

// ─── Schedule one alarm ───────────────────────────────────
/**
 * Arms the alarm for its next_fire_at wall-clock time, repeating on its
 * repeat_days (empty = every day). Returns the alarm id on success.
 */
export async function scheduleAlarm(alarm: SchedulableAlarm): Promise<string | null> {
  if (!alarm.enabled) return null;

  const fireDate = new Date(alarm.next_fire_at);
  if (fireDate.getTime() <= Date.now()) {
    // Callers roll the date forward first; this is only a safety net.
    console.warn(`[alarmScheduler] Skipping past alarm: ${alarm.label} at ${alarm.next_fire_at}`);
    return null;
  }

  // Replace whatever is already armed for this alarm.
  await cancelAlarm(alarm.id);

  const hour = fireDate.getHours();
  const minute = fireDate.getMinutes();
  const days = alarm.repeat_days?.length ? alarm.repeat_days : [0, 1, 2, 3, 4, 5, 6];
  const title = alarm.label || "Morning Que";

  // 1. A real alarm, where the device can set one.
  if (AlarmKit && hasNativeAlarms() && (await nativeAuthorized())) {
    try {
      await AlarmKit.scheduleAlarm(toUuid(alarm.id), {
        hour,
        minute,
        weekdays: days.map((d) => WEEKDAYS[d]),
        title,
        snoozeEnabled: true,
        snoozeDuration: SNOOZE_SEC,
        tintColor: C.accent,
        sound: CHIME,
      });
      await rememberScheduled(alarm.id, alarm.mantra_id, hour, minute);
      console.log(`[alarmScheduler] Native alarm "${title}" ${hour}:${String(minute).padStart(2, "0")}`);
      return alarm.id;
    } catch (err) {
      console.warn("[alarmScheduler] AlarmKit failed, falling back to notifications:", err);
    }
  }

  // 2. Notifications: a burst, a minute apart, each with the chime.
  try {
    for (let k = 0; k < BURST; k++) {
      await Notifications.scheduleNotificationAsync({
        identifier: burstId(alarm.id, k),
        content: {
          title,
          body: k === 0 ? "Good morning. Tap to start your session." : "Still time. Tap to start your session.",
          sound: CHIME,
          data: { alarmId: alarm.id, sessionId: alarm.mantra_id, type: "alarm" },
          // iOS 15+: breaks through Focus without an entitlement. Not the
          // silent switch; only Critical Alerts do that.
          ...(Platform.OS === "ios" && { interruptionLevel: "timeSensitive" as const }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireDate.getTime() + k * 60_000),
        },
      });
    }
    await rememberScheduled(alarm.id, alarm.mantra_id, hour, minute);
    console.log(`[alarmScheduler] Scheduled ${BURST} notifications for "${title}" from ${fireDate.toISOString()}`);
    return alarm.id;
  } catch (err) {
    console.error("[alarmScheduler] Failed to schedule alarm:", err);
    return null;
  }
}

const burstId = (id: string, k: number) => (k === 0 ? id : `${id}#${k}`);

// ─── Cancel one alarm ─────────────────────────────────────
export async function cancelAlarm(alarmId: string): Promise<void> {
  if (AlarmKit && hasNativeAlarms()) {
    try { await AlarmKit.cancel(toUuid(alarmId)); } catch {}
  }
  for (let k = 0; k < BURST; k++) {
    try { await Notifications.cancelScheduledNotificationAsync(burstId(alarmId, k)); } catch {}
  }
  await forgetScheduled(alarmId);
}

// ─── Cancel all alarms ────────────────────────────────────
export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (AlarmKit && hasNativeAlarms()) {
    try {
      const all = await AlarmKit.getAlarms();
      await Promise.all(all.map((a) => AlarmKit!.cancel(a.id).catch(() => {})));
    } catch {}
  }
}

// ─── Reschedule all from Supabase data ───────────────────
/**
 * Called on app start. Ensures the OS queue matches Supabase.
 * Cancels everything first, then reschedules all enabled alarms.
 */
export async function rescheduleAll(alarms: SchedulableAlarm[]): Promise<void> {
  await cancelAllAlarms();
  const enabled = alarms.filter((a) => a.enabled);
  await Promise.all(enabled.map(scheduleAlarm));
  console.log(`[alarmScheduler] Rescheduled ${enabled.length}/${alarms.length} alarms`);
}

// ─── Roll an alarm's fire time forward ───────────────────
/**
 * Returns the next FUTURE occurrence of the alarm's wall-clock time as an
 * ISO string. Empty repeat_days means "every day": an enabled morning
 * alarm keeps firing daily until it's switched off, like a bedside clock.
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
 * callback) and makes the OS queue match: every enabled alarm armed at a
 * future time, every disabled one cancelled.
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

// ─── List pending (debug) ────────────────────────────────
/** Pending fallback notifications, one entry per alarm (the burst collapsed). */
export async function getPendingAlarms(): Promise<Notifications.NotificationRequest[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => n.content.data?.type === "alarm" && !n.identifier.includes("#"));
}

/** Native alarms currently armed, for the debug screen. */
export async function getNativeAlarmCount(): Promise<number | null> {
  if (!AlarmKit || !hasNativeAlarms()) return null;
  try {
    return (await AlarmKit.getAlarms()).length;
  } catch {
    return null;
  }
}

// ─── Repeat alarm helper ─────────────────────────────────
/**
 * After an alarm fires, the next fire date for repeating alarms.
 * Returns null for non-repeating alarms.
 */
export function getNextRepeatDate(alarm: SchedulableAlarm): Date | null {
  if (!alarm.repeat_days || alarm.repeat_days.length === 0) return null;

  const now = new Date();
  const firedDate = new Date(alarm.next_fire_at);
  const firedHour = firedDate.getHours();
  const firedMin = firedDate.getMinutes();

  const todayDow = now.getDay();
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
