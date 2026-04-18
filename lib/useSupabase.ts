import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
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
    if (!user) return;
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
    if (!user) return;
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
export function useAlarms() {
  const { user } = useAuth();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("alarms")
      .select("*")
      .eq("user_id", user.id)
      .order("next_fire_at", { ascending: true });
    setAlarms(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (alarm: Omit<Database["public"]["Tables"]["alarms"]["Insert"], "user_id">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("alarms")
      .insert({ ...alarm, user_id: user.id })
      .select()
      .single();
    if (data) setAlarms((prev) => [...prev, data]);
    return { data, error };
  };

  const update = async (id: string, fields: Database["public"]["Tables"]["alarms"]["Update"]) => {
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
    if (!user) return;
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
    if (!user) return;
    const { data } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role, text })
      .select()
      .single();
    if (data) setMessages((prev) => [...prev, data]);
    return data;
  };

  const clear = async () => {
    if (!user) return;
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
    setSessions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { sessions, loading, refresh: fetch };
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
