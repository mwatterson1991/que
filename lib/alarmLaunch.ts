import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * alarmLaunch.ts — "did an alarm just go off?"
 *
 * A native AlarmKit alarm rings on the lock screen on its own; the app is
 * not running when it does. When the user then opens Morning Que (from
 * the alarm's button, or just by unlocking), the app has no event to go
 * on, so it keeps its own note of every scheduled alarm and, on each
 * foreground, checks whether one was due in the last few minutes. If so,
 * it opens that alarm's session, once.
 */

const KEY = "alarm_launch_v1";
const WINDOW_BEFORE_MS = 15 * 60_000; // rang up to 15 min ago
const WINDOW_AFTER_MS = 60_000;       // or is about to, within a minute

interface Entry {
  id: string;
  sessionId: string;
  hour: number;
  minute: number;
  /** Local date (YYYY-MM-DD) this alarm was last launched for. */
  launchedOn?: string;
}

type Book = Record<string, Entry>;

async function read(): Promise<Book> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Book) : {};
  } catch {
    return {};
  }
}

async function write(book: Book): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(book));
  } catch {}
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function rememberScheduled(id: string, sessionId: string, hour: number, minute: number) {
  const book = await read();
  book[id] = { ...book[id], id, sessionId, hour, minute };
  await write(book);
}

export async function forgetScheduled(id: string) {
  const book = await read();
  if (book[id]) {
    delete book[id];
    await write(book);
  }
}

/**
 * Mark an alarm as launched for today. Returns false if it already was,
 * so two entry paths (a notification tap and the foreground check) never
 * both open the player.
 */
export async function markLaunched(id: string, now = new Date()): Promise<boolean> {
  const book = await read();
  const today = localDate(now);
  const entry = book[id];
  if (!entry) return true;
  if (entry.launchedOn === today) return false;
  entry.launchedOn = today;
  await write(book);
  return true;
}

/**
 * If an alarm was due within the window and has not been launched today,
 * mark it launched and return its session id.
 */
export async function consumeDueAlarm(
  now = new Date(),
): Promise<{ alarmId: string; sessionId: string } | null> {
  const book = await read();
  const today = localDate(now);
  for (const entry of Object.values(book)) {
    if (entry.launchedOn === today) continue;
    const due = new Date(now);
    due.setHours(entry.hour, entry.minute, 0, 0);
    const delta = now.getTime() - due.getTime();
    if (delta >= -WINDOW_AFTER_MS && delta <= WINDOW_BEFORE_MS) {
      entry.launchedOn = today;
      await write(book);
      return { alarmId: entry.id, sessionId: entry.sessionId };
    }
  }
  return null;
}
