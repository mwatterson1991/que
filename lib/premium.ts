import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Premium gating (experiment) ───────────────────────────
// When PAYWALL_ENABLED is on, premium-tier sessions route to the
// paywall instead of playing.
//
// OFF for v1 submission: the Paid Apps Agreement is unsigned (needs
// Michael's banking + tax info in App Store Connect → Business), so
// real purchases can't exist yet and App Review rejects dead paywalls.
// Everything ships free at launch. To relaunch the experiment: sign the
// agreement, create the subscription products, wire a purchases SDK,
// then flip this to true.
export const PAYWALL_ENABLED = false;

export const PRICE_MONTHLY = "$9.99";
export const PRICE_YEARLY = "$59.99";

const UNLOCK_KEY = "premium_unlocked";

let cached: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

async function readUnlocked(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    cached = (await AsyncStorage.getItem(UNLOCK_KEY)) === "1";
  } catch {
    cached = false;
  }
  return cached;
}

export function usePremium() {
  const [unlocked, setUnlocked] = useState(cached ?? false);

  useEffect(() => {
    readUnlocked().then(setUnlocked);
    const cb = (v: boolean) => setUnlocked(v);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const unlock = useCallback(async () => {
    cached = true;
    await AsyncStorage.setItem(UNLOCK_KEY, "1").catch(() => {});
    listeners.forEach((cb) => cb(true));
  }, []);

  return { unlocked, unlock };
}

/** True when this session should hit the paywall for this user. */
export function isLocked(session: { tier?: string | null }, unlocked: boolean): boolean {
  return PAYWALL_ENABLED && !unlocked && session.tier === "premium";
}
