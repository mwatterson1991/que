// Tiny in-memory store with subscribe/notify so screens stay in sync.
// Swap for Zustand, Jotai, or Supabase realtime when you grow out of it.
import { useEffect, useState } from "react";
import type { Alarm, ChatMessage } from "./types";

type State = {
  alarms: Alarm[];
  messages: ChatMessage[];
};

let state: State = {
  alarms: [],
  messages: [],
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const store = {
  get: () => state,
  setAlarms(next: Alarm[]) {
    state = { ...state, alarms: next };
    notify();
  },
  addAlarm(a: Alarm) {
    state = { ...state, alarms: [a, ...state.alarms] };
    notify();
  },
  toggleAlarm(id: string) {
    state = {
      ...state,
      alarms: state.alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    };
    notify();
  },
  removeAlarm(id: string) {
    state = { ...state, alarms: state.alarms.filter((a) => a.id !== id) };
    notify();
  },
  addMessage(m: ChatMessage) {
    state = { ...state, messages: [...state.messages, m] };
    notify();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  const [value, setValue] = useState(() => selector(state));
  useEffect(() => {
    const l = () => setValue(selector(state));
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [selector]);
  return value;
}
