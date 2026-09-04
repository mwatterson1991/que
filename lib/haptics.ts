import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * haptics.ts — gentle patterns for waking up.
 *
 * iOS only plays app haptics while the app is on screen, so these run
 * when the alarm's session opens (and as a preview in the picker), not
 * from the lock screen. Each pattern is a short score of taps and rests
 * that loops softly until the person touches the screen.
 */

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

type Tap = "soft" | "light" | "medium" | "heavy" | "rigid" | "selection";
type Step = { tap?: Tap; rest: number };

export interface HapticPattern {
  id: string;
  name: string;
  description: string;
  /** One loop of the pattern. `rest` is the pause after the tap, in ms. */
  steps: Step[];
}

export const HAPTIC_PATTERNS: HapticPattern[] = [
  { id: "none", name: "None", description: "Sound only", steps: [] },
  {
    id: "soft-pulse",
    name: "Soft pulse",
    description: "One gentle tap, slowly repeated",
    steps: [{ tap: "soft", rest: 1400 }],
  },
  {
    id: "two-taps",
    name: "Two taps",
    description: "A quiet double tap, like a hand on the shoulder",
    steps: [{ tap: "light", rest: 160 }, { tap: "light", rest: 1600 }],
  },
  {
    id: "heartbeat",
    name: "Heartbeat",
    description: "Soft then firmer, at a resting pulse",
    steps: [{ tap: "soft", rest: 140 }, { tap: "medium", rest: 900 }],
  },
  {
    id: "rising",
    name: "Rising",
    description: "Three taps that build, then a breath",
    steps: [{ tap: "soft", rest: 320 }, { tap: "light", rest: 320 }, { tap: "medium", rest: 1500 }],
  },
  {
    id: "slow-wave",
    name: "Slow wave",
    description: "Soft taps that swell and fall away",
    steps: [
      { tap: "soft", rest: 500 },
      { tap: "light", rest: 400 },
      { tap: "medium", rest: 400 },
      { tap: "light", rest: 500 },
      { tap: "soft", rest: 1800 },
    ],
  },
];

export const DEFAULT_HAPTIC = "soft-pulse";

export function patternById(id: string | null | undefined): HapticPattern {
  return HAPTIC_PATTERNS.find((p) => p.id === id) ?? HAPTIC_PATTERNS[0];
}

async function tap(kind: Tap) {
  if (!Haptics) return;
  try {
    if (kind === "selection") return await Haptics.selectionAsync();
    const style = Haptics.ImpactFeedbackStyle;
    const map: Record<Exclude<Tap, "selection">, any> = {
      soft: style?.Soft ?? style?.Light,
      light: style?.Light,
      medium: style?.Medium,
      heavy: style?.Heavy,
      rigid: style?.Rigid ?? style?.Heavy,
    };
    await Haptics.impactAsync(map[kind]);
  } catch {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let runId = 0;

/** Play one loop of a pattern (the picker's preview). */
export async function previewPattern(id: string) {
  const token = ++runId;
  for (const step of patternById(id).steps) {
    if (token !== runId) return;
    if (step.tap) await tap(step.tap);
    await sleep(step.rest);
  }
}

/**
 * Loop a pattern until stopped or until `maxMs` passes. Used when an
 * alarm's session opens: it keeps nudging until the person interacts.
 */
export function startAlarmHaptics(id: string, maxMs = 45_000) {
  const pattern = patternById(id);
  if (pattern.steps.length === 0) return;
  const token = ++runId;
  const until = Date.now() + maxMs;
  (async () => {
    while (token === runId && Date.now() < until) {
      for (const step of pattern.steps) {
        if (token !== runId) return;
        if (step.tap) await tap(step.tap);
        await sleep(step.rest);
      }
    }
  })();
}

export function stopAlarmHaptics() {
  runId++;
}

// ─── Per-alarm choice ─────────────────────────────────────
// Stored on the phone, keyed by alarm id. "new" holds the choice made
// while an alarm is being created and is moved to the real id on save.

const KEY = "alarm_haptics_v1";

async function readAll(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function getAlarmHaptic(alarmId: string): Promise<string> {
  const all = await readAll();
  return all[alarmId] ?? DEFAULT_HAPTIC;
}

export async function setAlarmHaptic(alarmId: string, patternId: string) {
  const all = await readAll();
  all[alarmId] = patternId;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}

/** Move the "new" alarm's choice onto the id it was saved under. */
export async function adoptNewAlarmHaptic(alarmId: string) {
  const all = await readAll();
  if (all.new) {
    all[alarmId] = all.new;
    delete all.new;
    try { await AsyncStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  }
}
