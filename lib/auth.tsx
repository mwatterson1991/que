import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

// Local guest mode: lets someone use the app with no account at all.
// Alarms persist on-device (see useAlarms); the public session catalog
// is readable without auth. Creating or logging into a real account
// clears the flag.
const GUEST_MODE_KEY = "guest_mode";

type AuthState = {
  session: Session | null;
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  enterAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  isGuest: false,
  loading: true,
  enterAsGuest: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore initial session and guest flag together
    Promise.all([
      supabase.auth.getSession(),
      AsyncStorage.getItem(GUEST_MODE_KEY),
    ]).then(([{ data: { session } }, guestFlag]) => {
      setSession(session);
      setIsGuest(!session && guestFlag === "1");
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          // A real account supersedes guest mode
          setIsGuest(false);
          AsyncStorage.removeItem(GUEST_MODE_KEY).catch(() => {});
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const enterAsGuest = async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, "1").catch(() => {});
    setIsGuest(true);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || "",
          last_name: lastName || "",
          full_name: [firstName, lastName].filter(Boolean).join(" "),
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(GUEST_MODE_KEY).catch(() => {});
    setSession(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isGuest,
        loading,
        enterAsGuest,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
