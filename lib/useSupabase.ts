import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { LOCAL_SESSIONS } from "./catalog";
import { useAuth } from "./auth";
import type { Database } from "./database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Alarm = Database["public"]["Tables"]["alarms"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
type Score = Database["public"]["Tables"]["scores"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Activity = Database["public"]["Tables"]["activity"]["Row"];
type Preferences = Database["public"]["Tables"]["preferences"]["Row"];

// ─── Profile ─────────────────────────────────────────────
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (fields: Database["public"]["Tables"]["profiles"]["Update"]) => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return { data, error };
  };

  return { profile, loading, refresh: fetch, update };
}

// ─── Alarms ──────────────────────────────────────────────
// Guest alarms live on-device so the app works with no account.
const GUEST_ALARMS_KEY = "guest_alarms";

async function readGuestAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_ALARMS_KEY);
    return raw ? (JSON.parse(raw) as Alarm[]) : [];
  } catch {
    return [];
  }
}

async function writeGuestAlarms(list: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_ALARMS_KEY, JSON.stringify(list));
  } catch {}
}

export function useAlarms() {
  const { user, isGuest } = useAuth();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isGuest) {
      const list = await readGuestAlarms();
      list.sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at));
      setAlarms(list);
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("alarms")
      .select("*")
      .eq("user_id", user.id)
      .order("next_fire_at", { ascending: true });
    setAlarms(data ?? []);
    setLoading(false);
  }, [user, isGuest]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (alarm: Omit<Database["public"]["Tables"]["alarms"]["Insert"], "user_id">) => {
    if (isGuest) {
      const now = new Date().toISOString();
      const data: Alarm = {
        id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: "guest",
        label: alarm.label ?? "Alarm",
        next_fire_at: alarm.next_fire_at,
        repeat_days: alarm.repeat_days ?? [],
        mantra_id: alarm.mantra_id ?? "focus",
        enabled: alarm.enabled ?? true,
        created_at: now,
        updated_at: now,
      };
      const next = [...(await readGuestAlarms()), data];
      await writeGuestAlarms(next);
      setAlarms(next);
      return { data, error: null };
    }
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("alarms")
      .insert({ ...alarm, user_id: user.id })
      .select()
      .single();
    if (data) setAlarms((prev) => [...prev, data]);
    return { data, error };
  };

  const update = async (id: string, fields: Database["public"]["Tables"]["alarms"]["Update"]) => {
    if (isGuest) {
      const list = await readGuestAlarms();
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) return { data: null, error: { message: "Alarm not found" } };
      const data = { ...list[idx], ...fields, updated_at: new Date().toISOString() } as Alarm;
      list[idx] = data;
      await writeGuestAlarms(list);
      setAlarms([...list]);
      return { data, error: null };
    }
    const { data, error } = await supabase
      .from("alarms")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (data) setAlarms((prev) => prev.map((a) => (a.id === id ? data : a)));
    return { data, error };
  };

  const remove = async (id: string) => {
    if (isGuest) {
      const list = (await readGuestAlarms()).filter((a) => a.id !== id);
      await writeGuestAlarms(list);
      setAlarms(list);
      return;
    }
    await supabase.from("alarms").delete().eq("id", id);
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const toggle = async (id: string, enabled: boolean) => {
    return update(id, { enabled });
  };

  return { alarms, loading, refresh: fetch, add, update, remove, toggle };
}

// ─── Chat Messages ───────────────────────────────────────
export function useChatMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (role: "user" | "assistant", text: string) => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role, text })
      .select()
      .single();
    if (data) setMessages((prev) => [...prev, data]);
    return data;
  };

  const clear = async () => {
    if (!user) { setLoading(false); return; }
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
  };

  return { messages, loading, refresh: fetch, add, clear };
}

// ─── Scores (for profile chart) ──────────────────────────
export function useScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<Score[]>([]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: true });
    setScores(data ?? []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (score: number) => {
    if (!user) return;
    const { data } = await supabase
      .from("scores")
      .insert({ user_id: user.id, score })
      .select()
      .single();
    if (data) setScores((prev) => [...prev, data]);
  };

  return { scores, refresh: fetch, add };
}

// ─── Categories ──────────────────────────────────────────
export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setCategories(data ?? []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateProgress = async (id: string, progress: number) => {
    const { data } = await supabase
      .from("categories")
      .update({ progress })
      .eq("id", id)
      .select()
      .single();
    if (data) setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
  };

  return { categories, refresh: fetch, updateProgress };
}

// ─── Activity ────────────────────────────────────────────
export function useActivity() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<Activity[]>([]);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("activity")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(20);
    setActivity(data ?? []);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: Omit<Database["public"]["Tables"]["activity"]["Insert"], "user_id">) => {
    if (!user) return;
    const { data } = await supabase
      .from("activity")
      .insert({ ...item, user_id: user.id })
      .select()
      .single();
    if (data) setActivity((prev) => [data, ...prev]);
  };

  return { activity, refresh: fetch, add };
}

// ─── Sessions (public content library) ───────────────────
type Session = Database["public"]["Tables"]["sessions"]["Row"];

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("plays", { ascending: false });
    // Bundled naturescapes are part of the catalog even offline
    setSessions([...(data ?? []), ...LOCAL_SESSIONS]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { sessions, loading, refresh: fetch };
}

// ─── Habits ──────────────────────────────────────────────
type Habit = Database["public"]["Tables"]["habits"]["Row"];
type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];

// Guest habits/logs/gratitude live on-device, same idea as guest alarms.
const GUEST_HABITS_KEY = "guest_habits";
const GUEST_HABIT_LOGS_KEY = "guest_habit_logs";
const GUEST_GRATITUDE_KEY = "guest_gratitude";

async function readGuestList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

async function writeGuestList<T>(key: string, list: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

function guestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useHabits() {
  const { user, isGuest } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isGuest) {
      const list = await readGuestList<Habit>(GUEST_HABITS_KEY);
      setHabits(list.filter((h) => !h.archived));
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: true });
    setHabits(data ?? []);
    setLoading(false);
  }, [user, isGuest]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (habit: Omit<Database["public"]["Tables"]["habits"]["Insert"], "user_id">) => {
    if (isGuest) {
      const data = {
        archived: false,
        created_at: new Date().toISOString(),
        ...habit,
        id: guestId("guest-habit"),
        user_id: "guest",
      } as Habit;
      const next = [...(await readGuestList<Habit>(GUEST_HABITS_KEY)), data];
      await writeGuestList(GUEST_HABITS_KEY, next);
      setHabits(next.filter((h) => !h.archived));
      return { data, error: null };
    }
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("habits")
      .insert({ ...habit, user_id: user.id })
      .select()
      .single();
    if (data) setHabits((prev) => [...prev, data]);
    return { data, error };
  };

  const update = async (id: string, fields: Database["public"]["Tables"]["habits"]["Update"]) => {
    if (isGuest) {
      const list = await readGuestList<Habit>(GUEST_HABITS_KEY);
      const idx = list.findIndex((h) => h.id === id);
      if (idx === -1) return { data: null, error: { message: "Habit not found" } };
      const data = { ...list[idx], ...fields } as Habit;
      list[idx] = data;
      await writeGuestList(GUEST_HABITS_KEY, list);
      setHabits(list.filter((h) => !h.archived));
      return { data, error: null };
    }
    const { data, error } = await supabase
      .from("habits")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (data) setHabits((prev) => prev.map((h) => (h.id === id ? data : h)));
    return { data, error };
  };

  const archive = async (id: string) => {
    await update(id, { archived: true });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return { habits, loading, refresh: fetch, add, update, archive };
}

export function useHabitLogs(rangedays = 31) {
  const { user, isGuest } = useAuth();
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  const since = new Date();
  since.setDate(since.getDate() - rangedays);
  const sinceStr = since.toLocaleDateString("en-CA");

  const fetch = useCallback(async () => {
    if (isGuest) {
      const list = await readGuestList<HabitLog>(GUEST_HABIT_LOGS_KEY);
      setLogs(list.filter((l) => l.log_date >= sinceStr));
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", sinceStr)
      .order("logged_at", { ascending: true });
    setLogs(data ?? []);
    setLoading(false);
  }, [user, isGuest, sinceStr]);

  useEffect(() => { fetch(); }, [fetch]);

  const logHabit = async (habit_id: string) => {
    if (isGuest) {
      const data = {
        id: guestId("guest-log"),
        habit_id,
        user_id: "guest",
        log_date: new Date().toLocaleDateString("en-CA"),
        logged_at: new Date().toISOString(),
      } as HabitLog;
      const next = [...(await readGuestList<HabitLog>(GUEST_HABIT_LOGS_KEY)), data];
      await writeGuestList(GUEST_HABIT_LOGS_KEY, next);
      setLogs((prev) => [...prev, data]);
      return { data, error: null };
    }
    if (!user) { setLoading(false); return; }
    const log_date = new Date().toLocaleDateString("en-CA");
    const { data, error } = await supabase
      .from("habit_logs")
      .insert({ habit_id, user_id: user.id, log_date })
      .select()
      .single();
    if (data) setLogs((prev) => [...prev, data]);
    return { data, error };
  };

  const removeLog = async (id: string) => {
    if (isGuest) {
      const list = (await readGuestList<HabitLog>(GUEST_HABIT_LOGS_KEY)).filter((l) => l.id !== id);
      await writeGuestList(GUEST_HABIT_LOGS_KEY, list);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    await supabase.from("habit_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Count today's logs for a given habit
  const todayCount = (habit_id: string) => {
    const today = new Date().toLocaleDateString("en-CA");
    return logs.filter((l) => l.habit_id === habit_id && l.log_date === today).length;
  };

  // All logs for a given habit on a given date
  const logsForHabitOnDate = (habit_id: string, date: string) =>
    logs.filter((l) => l.habit_id === habit_id && l.log_date === date);

  return { logs, loading, refresh: fetch, logHabit, removeLog, todayCount, logsForHabitOnDate };
}

// ─── Gratitude Entries ───────────────────────────────────
type GratitudeEntry = Database["public"]["Tables"]["gratitude_entries"]["Row"];

const POINTS_PER_ENTRY = 1;
const POINTS_COMPLETION_BONUS = 3; // extra points when the seventh line of the day lands; later lines earn the normal point

function localDateString(date = new Date()) {
  // YYYY-MM-DD in the device's local timezone
  return date.toLocaleDateString("en-CA");
}

function sortGratitude(list: GratitudeEntry[]) {
  return [...list].sort((a, b) => {
    if (a.entry_date !== b.entry_date) return b.entry_date.localeCompare(a.entry_date);
    return a.entry_number - b.entry_number;
  });
}

export function useGratitudeEntries() {
  const { user, isGuest } = useAuth();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isGuest) {
      const list = await readGuestList<GratitudeEntry>(GUEST_GRATITUDE_KEY);
      setEntries(sortGratitude(list));
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("gratitude_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .order("entry_number", { ascending: true });
    setEntries(data ?? []);
    setLoading(false);
  }, [user, isGuest]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsert = async (entry_number: number, entry_text: string, entry_date: string) => {
    if (isGuest) {
      const list = await readGuestList<GratitudeEntry>(GUEST_GRATITUDE_KEY);
      const filtered = list.filter(
        (e) => !(e.entry_date === entry_date && e.entry_number === entry_number)
      );
      const data = {
        id: `guest-${entry_date}-${entry_number}`,
        user_id: "guest",
        entry_text,
        entry_number,
        entry_date,
        created_at: new Date().toISOString(),
      } as GratitudeEntry;
      const next = sortGratitude([...filtered, data]);
      await writeGuestList(GUEST_GRATITUDE_KEY, next);
      setEntries(next);
      return { data, error: null };
    }
    if (!user) { setLoading(false); return; }

    // Is this a new entry or an edit of an existing one?
    const isNew = !entries.find(
      (e) => e.entry_date === entry_date && e.entry_number === entry_number
    );

    // Optimistic update
    const tempId = `optimistic-${entry_date}-${entry_number}`;
    setEntries((prev) => {
      const filtered = prev.filter(
        (e) => !(e.entry_date === entry_date && e.entry_number === entry_number)
      );
      const updated: GratitudeEntry = {
        id: tempId,
        user_id: user.id,
        entry_text,
        entry_number,
        entry_date,
        created_at: new Date().toISOString(),
      };
      return [...filtered, updated].sort((a, b) => {
        if (a.entry_date !== b.entry_date) return b.entry_date.localeCompare(a.entry_date);
        return a.entry_number - b.entry_number;
      });
    });

    const { data, error } = await supabase
      .from("gratitude_entries")
      .upsert(
        { user_id: user.id, entry_text, entry_number, entry_date },
        { onConflict: "user_id,entry_date,entry_number" }
      )
      .select()
      .single();

    if (data) {
      // Replace optimistic entry with the real persisted row
      setEntries((prev) =>
        prev
          .map((e) => (e.id === tempId ? data : e))
          .sort((a, b) => {
            if (a.entry_date !== b.entry_date) return b.entry_date.localeCompare(a.entry_date);
            return a.entry_number - b.entry_number;
          })
      );

      // Award points only for new entries (not edits)
      if (isNew) {
        let points = POINTS_PER_ENTRY;

        // Count how many real entries exist for this date after this save
        const savedForDate = entries.filter(
          (e) => e.entry_date === entry_date
        ).length + 1; // +1 for the one we just saved

        // There is no daily cap on lines; only the seventh one carries the bonus.
        if (savedForDate === 7) {
          points += POINTS_COMPLETION_BONUS;
        }

        await supabase.from("scores").insert({ user_id: user.id, score: points });

        // Increment profile total score
        const { data: profile } = await supabase
          .from("profiles")
          .select("score")
          .eq("id", user.id)
          .single();
        if (profile) {
          await supabase
            .from("profiles")
            .update({ score: profile.score + points })
            .eq("id", user.id);
        }
      }
    }

    return { data, error };
  };

  return { entries, loading, refresh: fetch, upsert, localDateString };
}

// ─── Preferences ─────────────────────────────────────────
export function usePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setPrefs(data);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (fields: Database["public"]["Tables"]["preferences"]["Update"]) => {
    if (!user) return;
    const { data } = await supabase
      .from("preferences")
      .update(fields)
      .eq("user_id", user.id)
      .select()
      .single();
    if (data) setPrefs(data);
  };

  return { prefs, refresh: fetch, update };
}
