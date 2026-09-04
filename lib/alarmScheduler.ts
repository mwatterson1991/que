/**
 * alarmScheduler.ts
 *
 * Two ways to wake someone, and this file always arms BOTH:
 *
 * 1. iOS 26+: a REAL alarm through Apple's AlarmKit. It rings on the
 *    lock screen with a full-screen alert, breaks through the silent
 *    switch and every Focus, offers Stop and Snooze, and repeats daily on
 *    its own. The module is a silent no-op below iOS 26 and on Android.
 *
 * 2. Everywhere, as the backup: local notifications. One notification is
 *    one short ding, so it is a burst of five, a minute apart, each with
 *    the app's own 28-second chime and Time Sensitive priority. The first
 *    fires at the alarm time; when the native alarm works and the app is
 *    opened, the rest are cancelled (see lib/alarmLaunch.ts).
 *
 * Every schedule writes a report (what was tried, what succeeded, the
 * error text if not) that the Alarm Diagnostics screen shows, so a failed
 * morning can be read off a screenshot instead of guessed at.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C } from "@/lib/tokens";
import { rememberScheduled, forgetScheduled } from "./alarmLaunch";

// ─── AlarmKit (optional at runtime) ──────────────────────
type AlarmKitModule = typeof import("react-native-ios-alarmkit");
type Weekday = import("react-native-ios-alarmkit").Weekday;

let Kit: AlarmKitModule | null = null;
let kitLoadError: string | null = null;
try {
  Kit = require("react-native-ios-alarmkit") as AlarmKitModule;
} catch (err) {
  Kit = null;
  kitLoadError = String((err as any)?.message ?? err);
}

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** The bundled 28-second chime (see app.json → expo-notifications.sounds). */
const CHIME = "alarm-chime.wav";
/** Backup notifications per alarm, one minute apart. */
const BURST = 5;
/** Snooze length for native alarms, in seconds. */
const SNOOZE_SEC = 9 * 60;
const REPORT_KEY = "alarm_schedule_report_v1";

/** True when this device can set a real alarm. */
export function hasNativeAlarms(): boolean {
  try {
    return !!Kit && Kit.AlarmKit.isSupported;
  } catch {
    return false;
  }
}

async function nativeAuthorized(): Promise<boolean> {
  if (!Kit) return false;
  try {
    const state = await Kit.AlarmKit.getAuthorizationState();
    if (state === "authorized") return true;
    if (state === "denied") return false;
    return await Kit.AlarmKit.requestAuthorization();
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

/** What the last schedule attempt did. Shown on the diagnostics screen. */
export interface ScheduleReport {
  at: string;
  alarmId: string;
  label: string;
  fireAt: string;
  native: string;         // "armed" | "unsupported" | "unauthorized" | "error: …"
  notifications: string;  // "5 armed" | "error: …"
}

async function writeReport(r: ScheduleReport) {
  try { await AsyncStorage.setItem(REPORT_KEY, JSON.stringify(r)); } catch {}
}

// ─── Android channel ─────────────────────────────────────
// Must be created before scheduling on Android. Safe to call multiple times.
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("que-alarms", {
    name: "Que Alarms",
    importance: Notifications.AndroidImportance.MAX,
    bypassDnd: true,
    vibrationPattern: [0, 500, 200, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: CHIME,
  });
}

// ─── Permission request ───────────────────────────────────
/** Asks for both: the real alarm (iOS 26) and notifications (the backup). */
export async function requestAlarmPermissions(): Promise<boolean> {
  await ensureAndroidChannel();

  let native = false;
  if (hasNativeAlarms()) native = await nativeAuthorized();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let notif = existing === "granted";
  if (!notif) {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false, allowProvisional: false },
    });
    notif = status === "granted";
  }
  return native || notif;
}

// ─── Schedule one alarm ───────────────────────────────────
/**
 * Arms the alarm for its next_fire_at wall-clock time, repeating on its
 * repeat_days (empty = every day). Returns the alarm id if anything at all
 * was armed.
 */
export async function scheduleAlarm(alarm: SchedulableAlarm): Promise<string | null> {
  if (!alarm.enabled) return null;

  const fireDate = new Date(alarm.next_fire_at);
  if (fireDate.getTime() <= Date.now()) {
    console.warn(`[alarmScheduler] Skipping past alarm: ${alarm.label} at ${alarm.next_fire_at}`);
    return null;
  }

  // Replace whatever is already armed for this alarm.
  await cancelAlarm(alarm.id);

  const hour = fireDate.getHours();
  const minute = fireDate.getMinutes();
  const days = alarm.repeat_days?.length ? alarm.repeat_days : [0, 1, 2, 3, 4, 5, 6];
  const title = alarm.label || "Morning Que";
  const report: ScheduleReport = {
    at: new Date().toISOString(),
    alarmId: alarm.id,
    label: title,
    fireAt: fireDate.toISOString(),
    native: "unsupported",
    notifications: "",
  };

  // 1. A real alarm, where the device can set one.
  if (Kit && hasNativeAlarms()) {
    if (!(await nativeAuthorized())) {
      report.native = "unauthorized";
    } else {
      try {
        const button = (text: string, icon: string) => ({ text, textColor: C.label, systemImageName: icon });
        // The full configuration, not the module's shorthand: AlarmKit
        // insists on a countdown presentation whenever the secondary
        // button snoozes, and the shorthand leaves it out.
        await Kit.AlarmKitManager.shared.scheduleOrReschedule(toUuid(alarm.id), {
          countdownDuration: { preAlert: 0, postAlert: SNOOZE_SEC },
          schedule: { type: "relative", hour, minute, weekdays: days.map((d) => WEEKDAYS[d]) },
          presentation: {
            alert: {
              title,
              stopButton: button("Stop", "stop.circle"),
              secondaryButton: button("Snooze", "zzz"),
              secondaryButtonBehavior: "countdown",
            },
            countdown: { title: "Snoozed", pauseButton: button("Pause", "pause.circle") },
            paused: { title: "Paused", resumeButton: button("Resume", "play.circle") },
          },
          tintColor: C.accent,
          soundName: CHIME,
          metadata: { sessionId: alarm.mantra_id, alarmId: alarm.id },
        });
        report.native = "armed";
      } catch (err) {
        report.native = `error: ${String((err as any)?.message ?? err)}`;
        console.warn("[alarmScheduler] AlarmKit failed:", err);
      }
    }
  } else if (kitLoadError) {
    report.native = `module missing: ${kitLoadError}`;
  }

  // 2. Notifications, always: the backup that also covers older iOS and Android.
  let armed = 0;
  try {
    for (let k = 0; k < BURST; k++) {
      await Notifications.scheduleNotificationAsync({
        identifier: burstId(alarm.id, k),
        content: {
          title,
          body: k === 0 ? "Good morning. Tap to start your session." : "Still time. Tap to start your session.",
          sound: CHIME,
          data: { alarmId: alarm.id, sessionId: alarm.mantra_id, type: "alarm" },
          ...(Platform.OS === "ios" && { interruptionLevel: "timeSensitive" as const }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireDate.getTime() + k * 60_000),
        },
      });
      armed++;
    }
    report.notifications = `${armed} armed`;
  } catch (err) {
    report.notifications = `${armed} armed, then error: ${String((err as any)?.message ?? err)}`;
    console.error("[alarmScheduler] Notification scheduling failed:", err);
  }

  await writeReport(report);
  const ok = report.native === "armed" || armed > 0;
  if (ok) await rememberScheduled(alarm.id, alarm.mantra_id, hour, minute);
  console.log(`[alarmScheduler] ${title} ${hour}:${String(minute).padStart(2, "0")} native=${report.native} notifications=${report.notifications}`);
  return ok ? alarm.id : null;
}

const burstId = (id: string, k: number) => (k === 0 ? id : `${id}#${k}`);

/** Once the app has opened after an alarm, the remaining backup chimes are noise. */
export async function cancelBackupNotifications(alarmId: string): Promise<void> {
  for (let k = 1; k < BURST; k++) {
    try { await Notifications.cancelScheduledNotificationAsync(burstId(alarmId, k)); } catch {}
  }
}

// ─── Cancel one alarm ─────────────────────────────────────
export async function cancelAlarm(alarmId: string): Promise<void> {
  if (Kit && hasNativeAlarms()) {
    try { await Kit.AlarmKit.cancel(toUuid(alarmId)); } catch {}
  }
  for (let k = 0; k < BURST; k++) {
    try { await Notifications.cancelScheduledNotificationAsync(burstId(alarmId, k)); } catch {}
  }
  await forgetScheduled(alarmId);
}

// ─── Cancel all alarms ────────────────────────────────────
export async function cancelAllAlarms(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Kit && hasNativeAlarms()) {
    try {
      const all = await Kit.AlarmKit.getAlarms();
      await Promise.all(all.map((a) => Kit!.AlarmKit.cancel(a.id).catch(() => {})));
    } catch {}
  }
}

// ─── Reschedule all from Supabase data ───────────────────
export async function rescheduleAll(alarms: SchedulableAlarm[]): Promise<void> {
  await cancelAllAlarms();
  const enabled = alarms.filter((a) => a.enabled);
  await Promise.all(enabled.map(scheduleAlarm));
  console.log(`[alarmScheduler] Rescheduled ${enabled.length}/${alarms.length} alarms`);
}

// ─── Roll an alarm's fire time forward ───────────────────
/**
 * Returns the next FUTURE occurrence of the alarm's wall-clock time as an
 * ISO string. Empty repeat_days means "every day".
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

// ─── Diagnostics ─────────────────────────────────────────
/** Pending backup notifications, one entry per alarm (the burst collapsed). */
export async function getPendingAlarms(): Promise<Notifications.NotificationRequest[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => n.content.data?.type === "alarm" && !n.identifier.includes("#"));
}

export interface AlarmDiagnostics {
  platform: string;
  nativeModule: string;      // "loaded" | "missing: …"
  nativeSupported: boolean;
  nativeAuthorization: string;
  nativeArmed: number | null;
  notificationPermission: string;
  pendingNotifications: number;
  lastReport: ScheduleReport | null;
}

/** Everything the diagnostics screen shows. Never throws. */
export async function getAlarmDiagnostics(): Promise<AlarmDiagnostics> {
  const d: AlarmDiagnostics = {
    platform: `${Platform.OS} ${Platform.Version}`,
    nativeModule: Kit ? "loaded" : `missing: ${kitLoadError ?? "unknown"}`,
    nativeSupported: hasNativeAlarms(),
    nativeAuthorization: "n/a",
    nativeArmed: null,
    notificationPermission: "unknown",
    pendingNotifications: 0,
    lastReport: null,
  };
  if (Kit && d.nativeSupported) {
    try { d.nativeAuthorization = await Kit.AlarmKit.getAuthorizationState(); } catch (e) { d.nativeAuthorization = `error: ${String((e as any)?.message ?? e)}`; }
    try { d.nativeArmed = (await Kit.AlarmKit.getAlarms()).length; } catch { d.nativeArmed = null; }
  }
  try { d.notificationPermission = (await Notifications.getPermissionsAsync()).status; } catch {}
  try { d.pendingNotifications = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.content.data?.type === "alarm").length; } catch {}
  try {
    const raw = await AsyncStorage.getItem(REPORT_KEY);
    d.lastReport = raw ? (JSON.parse(raw) as ScheduleReport) : null;
  } catch {}
  return d;
}

// ─── Repeat alarm helper ─────────────────────────────────
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
