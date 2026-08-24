import { supabase } from "./supabase";

// ─── Guest entry ───────────────────────────────────────────
// Lets someone into the app from the welcome screen without the
// login wall. Uses Supabase anonymous sign-in, which must be enabled
// in the dashboard (Authentication → Sign In / Providers → Allow
// anonymous sign-ins). Guests are marked onboarded so AuthGate sends
// them straight to the alarms home screen.

export type GuestResult =
  | { ok: true }
  | { ok: false; reason: "anonymous-disabled" | "error"; message: string };

/** Ensure there is a session, creating an anonymous guest one if needed. */
export async function ensureGuestSession(): Promise<GuestResult> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return { ok: true };

  const { error } = await supabase.auth.signInAnonymously({
    options: { data: { guest: true, onboarded: true } },
  });

  if (!error) return { ok: true };

  const disabled =
    error.message?.toLowerCase().includes("anonymous") ||
    (error as any).code === "anonymous_provider_disabled";
  return {
    ok: false,
    reason: disabled ? "anonymous-disabled" : "error",
    message: error.message,
  };
}

/** True when the current user is an anonymous guest. */
export function isGuestUser(user: { is_anonymous?: boolean } | null): boolean {
  return user?.is_anonymous === true;
}
