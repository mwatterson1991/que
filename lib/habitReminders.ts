import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

/**
 * Habit reminders live on the phone, not in the habits table: a reminder is
 * a property of this device's notification queue, so it is stored here in
 * AsyncStorage next to the scheduled notifications it describes, under one
 * key for every habit.
 *
 *   setReminder(id, { title, hour, minute, timesPerDay })  schedule daily
 *   clearReminder(id)                                       cancel
 *   getReminder(id)                                         stored setting or null
 *
 * A habit done more than once a day gets one notification per time, spaced
 * three hours apart from the chosen start. Identifiers are `habit:<id>:<n>`
 * so a later set or clear can find every one of them.
 */

export type HabitReminder = {
  /** The habit's name; it is the notification title. */
  title: string;
  /** 24 hour clock. */
  hour: number;
  minute: number;
  timesPerDay: number;
};

const STORAGE_KEY = "habit_reminders_v1";
const SPACING_HOURS = 3;
/** The most slots ever cancelled for one habit, in case the stored count is lost. */
const MAX_SLOTS = 10;

const slotId = (habitId: string, n: number) => `habit:${habitId}:${n}`;

async function readAll(): Promise<Record<string, HabitReminder>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, HabitReminder>) : {};
  } catch {
    return {};
  }
}

async function writeAll(all: Record<string, HabitReminder>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

async function cancelSlots(habitId: string, count: number): Promise<void> {
  for (let n = 0; n < count; n++) {
    try { await Notifications.cancelScheduledNotificationAsync(slotId(habitId, n)); } catch {}
  }
}

/** The stored reminder for a habit, or null when it has none. */
export async function getReminder(habitId: string): Promise<HabitReminder | null> {
  const all = await readAll();
  return all[habitId] ?? null;
}

/** The clock times a reminder fires at, first one first. */
export function reminderTimes(setting: Pick<HabitReminder, "hour" | "minute" | "timesPerDay">) {
  return Array.from({ length: Math.max(1, setting.timesPerDay) }, (_, n) => ({
    hour: (setting.hour + n * SPACING_HOURS) % 24,
    minute: setting.minute,
  }));
}

/**
 * Schedule (or reschedule) a habit's daily reminders. Returns false when the
 * phone refused, in which case nothing is stored.
 */
export async function setReminder(habitId: string, setting: HabitReminder): Promise<boolean> {
  const all = await readAll();
  await cancelSlots(habitId, Math.max(all[habitId]?.timesPerDay ?? 0, MAX_SLOTS));

  try {
    const times = reminderTimes(setting);
    for (let n = 0; n < times.length; n++) {
      await Notifications.scheduleNotificationAsync({
        identifier: slotId(habitId, n),
        content: {
          title: setting.title,
          body: `Time for ${setting.title}`,
          data: { type: "habit", habitId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: times[n].hour,
          minute: times[n].minute,
        },
      });
    }
  } catch {
    await cancelSlots(habitId, MAX_SLOTS);
    return false;
  }

  all[habitId] = setting;
  await writeAll(all);
  return true;
}

/** Cancel a habit's reminders and forget the setting. */
export async function clearReminder(habitId: string): Promise<void> {
  const all = await readAll();
  await cancelSlots(habitId, Math.max(all[habitId]?.timesPerDay ?? 0, MAX_SLOTS));
  if (all[habitId]) {
    delete all[habitId];
    await writeAll(all);
  }
}
