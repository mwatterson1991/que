import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://wesobiewlaakwvrfldpn.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc29iaWV3bGFha3d2cmZsZHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDMzNDksImV4cCI6MjA5MTYxOTM0OX0.TYWCdN_h44cqhd4YKBiUl0aHjSygJAtPE0Qj4Wtgvik";

// Simple in-memory storage adapter (works without AsyncStorage)
// For persistence across app restarts, install @react-native-async-storage/async-storage
let _storage: Record<string, string> = {};
let AsyncStorage: any = null;

try {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  // AsyncStorage not available — sessions won't persist across restarts
}

const StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (AsyncStorage) return AsyncStorage.getItem(key);
    return _storage[key] ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (AsyncStorage) return AsyncStorage.setItem(key, value);
    _storage[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    if (AsyncStorage) return AsyncStorage.removeItem(key);
    delete _storage[key];
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: StorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
