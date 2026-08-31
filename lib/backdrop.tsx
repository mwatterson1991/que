import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * backdrop.tsx — the brand surface.
 *
 * The background is where Morning Que's identity lives: abstract,
 * isometric fields of light that the Liquid Glass reacts to. Never a
 * photograph (glass over imagery reads muddy) and never a flat linear
 * ramp (boring). Each preset is a base color plus drifting blobs of
 * light, optionally crossed by fine radiating rays.
 *
 * Two dimming concepts, deliberately separate:
 *  - stageDark: the user pulls the house lights all the way down.
 *  - windDown: the lights fade on their own the longer you sit here,
 *    so opening the app at night starts the descent toward sleep.
 */

export interface BackdropBlob {
  color: string;
  edge: string;
  xPct: number;       // center, fraction of width
  yPct: number;       // center, fraction of height
  sizePct: number;    // diameter, fraction of width
  driftXPct: number;
  driftYPct: number;
  scaleTo: number;
  durationMs: number;
  delayMs?: number;
  opacity?: number;
}

export interface BackdropPreset {
  id: string;
  name: string;
  description: string;
  base: string;
  blobs: BackdropBlob[];
  /** Fine radiating lines — the "isometric, not linear" texture. */
  rays?: { color: string; count: number; opacity: number; originXPct: number; originYPct: number };
  /** Scattered starlight. */
  sparkle?: { count: number; opacity: number };
  /** Swatch colors for the picker chip. */
  swatch: string[];
}

export const BACKDROP_PRESETS: BackdropPreset[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Deep forest green, breathing slowly",
    base: "#020805",
    swatch: ["#2fbf71", "#0e6e54", "#9fe870"],
    blobs: [
      { color: "#2fbf71", edge: "#0a3d24", xPct: 0.3, yPct: 0.28, sizePct: 1.6, driftXPct: 0.18, driftYPct: 0.08, scaleTo: 1.25, durationMs: 9000 },
      { color: "#0e6e54", edge: "#04231a", xPct: 0.85, yPct: 0.75, sizePct: 1.9, driftXPct: -0.14, driftYPct: -0.1, scaleTo: 1.3, durationMs: 13000, delayMs: 1200 },
      { color: "#9fe870", edge: "#2fbf71", xPct: 0.7, yPct: 0.15, sizePct: 0.9, driftXPct: -0.25, driftYPct: 0.22, scaleTo: 1.45, durationMs: 11000, delayMs: 600, opacity: 0.55 },
    ],
  },
  {
    id: "copper",
    name: "Copper Silk",
    description: "Warm light folding over itself",
    base: "#150c06",
    swatch: ["#e8b789", "#8a5230", "#3a2114"],
    blobs: [
      { color: "#e8b789", edge: "#8a5230", xPct: 0.72, yPct: 0.42, sizePct: 1.5, driftXPct: -0.16, driftYPct: 0.12, scaleTo: 1.3, durationMs: 12000 },
      { color: "#8a5230", edge: "#3a2114", xPct: 0.2, yPct: 0.72, sizePct: 1.7, driftXPct: 0.2, driftYPct: -0.14, scaleTo: 1.22, durationMs: 15000, delayMs: 1500 },
      { color: "#f4d3b0", edge: "#c98f5c", xPct: 0.9, yPct: 0.2, sizePct: 0.8, driftXPct: -0.2, driftYPct: 0.3, scaleTo: 1.4, durationMs: 10000, delayMs: 800, opacity: 0.5 },
    ],
  },
  {
    id: "ember",
    name: "Ember",
    description: "Darkness with a fire low on the horizon",
    base: "#050303",
    swatch: ["#ffd7a8", "#c2673a", "#1a0d07"],
    blobs: [
      { color: "#ffd7a8", edge: "#c2673a", xPct: 0.5, yPct: 1.02, sizePct: 1.9, driftXPct: 0.06, driftYPct: -0.08, scaleTo: 1.18, durationMs: 14000 },
      { color: "#c2673a", edge: "#1a0d07", xPct: 0.25, yPct: 0.88, sizePct: 1.4, driftXPct: 0.18, driftYPct: -0.05, scaleTo: 1.3, durationMs: 17000, delayMs: 2000, opacity: 0.7 },
    ],
  },
  {
    id: "prism",
    name: "Prism",
    description: "Cold light split into colour",
    base: "#03040a",
    swatch: ["#3ad8f0", "#7b5cf0", "#f0553a"],
    blobs: [
      { color: "#3ad8f0", edge: "#0a2740", xPct: 0.9, yPct: 0.2, sizePct: 1.5, driftXPct: -0.14, driftYPct: 0.14, scaleTo: 1.25, durationMs: 11000 },
      { color: "#7b5cf0", edge: "#1a1040", xPct: 0.78, yPct: 0.68, sizePct: 1.5, driftXPct: -0.12, driftYPct: -0.12, scaleTo: 1.3, durationMs: 14000, delayMs: 900 },
      { color: "#f0553a", edge: "#3a0f10", xPct: 0.12, yPct: 0.88, sizePct: 1.3, driftXPct: 0.16, driftYPct: -0.16, scaleTo: 1.35, durationMs: 12500, delayMs: 1800, opacity: 0.75 },
    ],
    rays: { color: "#8fd8ff", count: 54, opacity: 0.1, originXPct: 1.15, originYPct: -0.15 },
    sparkle: { count: 46, opacity: 0.5 },
  },
  {
    id: "tide",
    name: "Tide",
    description: "Deep water, far from shore",
    base: "#01060c",
    swatch: ["#3aa0d8", "#0d4f6e", "#7ce0d0"],
    blobs: [
      { color: "#3aa0d8", edge: "#062537", xPct: 0.28, yPct: 0.32, sizePct: 1.7, driftXPct: 0.16, driftYPct: 0.1, scaleTo: 1.28, durationMs: 12000 },
      { color: "#0d4f6e", edge: "#01131d", xPct: 0.85, yPct: 0.78, sizePct: 1.8, driftXPct: -0.15, driftYPct: -0.12, scaleTo: 1.24, durationMs: 16000, delayMs: 1400 },
      { color: "#7ce0d0", edge: "#2a8f8a", xPct: 0.62, yPct: 0.12, sizePct: 0.85, driftXPct: -0.2, driftYPct: 0.26, scaleTo: 1.4, durationMs: 10500, delayMs: 700, opacity: 0.45 },
    ],
    sparkle: { count: 28, opacity: 0.35 },
  },
];

/** Palette offered when building your own. */
export const CUSTOM_COLORS = [
  "#2fbf71", "#9fe870", "#7ce0d0", "#3ad8f0", "#3aa0d8",
  "#7b5cf0", "#c46bd8", "#f0553a", "#e8b789", "#ffd7a8",
];

export function buildCustomPreset(colors: string[]): BackdropPreset {
  const [a, b, c] = [colors[0] ?? "#2fbf71", colors[1] ?? "#3ad8f0", colors[2] ?? "#7b5cf0"];
  return {
    id: "custom",
    name: "Yours",
    description: "Built from your colours",
    base: "#04050a",
    swatch: [a, b, c],
    blobs: [
      { color: a, edge: "#050810", xPct: 0.28, yPct: 0.26, sizePct: 1.6, driftXPct: 0.18, driftYPct: 0.1, scaleTo: 1.28, durationMs: 11000 },
      { color: b, edge: "#050810", xPct: 0.86, yPct: 0.72, sizePct: 1.7, driftXPct: -0.15, driftYPct: -0.12, scaleTo: 1.3, durationMs: 14000, delayMs: 1100 },
      { color: c, edge: "#050810", xPct: 0.6, yPct: 0.14, sizePct: 1.0, driftXPct: -0.22, driftYPct: 0.24, scaleTo: 1.42, durationMs: 12500, delayMs: 600, opacity: 0.6 },
    ],
    rays: { color: b, count: 44, opacity: 0.08, originXPct: 1.1, originYPct: -0.1 },
  };
}

// ─── Context ─────────────────────────────────────────────
const PRESET_KEY = "backdrop_preset_v1";
const CUSTOM_KEY = "backdrop_custom_colors_v1";
const WINDDOWN_KEY = "backdrop_winddown_v1";

/** Where the lights settle when wind-down has fully run. */
const WIND_DOWN_FLOOR = 0.45;
const WIND_DOWN_MS = 150000; // 2.5 min from open to settled

interface BackdropValue {
  preset: BackdropPreset;
  presetId: string;
  setPresetId: (id: string) => void;
  customColors: string[];
  setCustomColors: (colors: string[]) => void;
  /** 0 = house lights out, 1 = full. */
  level: number;
  stageDark: boolean;
  setStageDark: (on: boolean) => void;
  windDown: boolean;
  setWindDown: (on: boolean) => void;
}

const BackdropContext = createContext<BackdropValue | null>(null);

export function BackdropProvider({ children }: { children: ReactNode }) {
  const [presetId, setPresetIdState] = useState("aurora");
  const [customColors, setCustomColorsState] = useState<string[]>(["#2fbf71", "#3ad8f0", "#7b5cf0"]);
  const [stageDark, setStageDarkState] = useState(false);
  const [windDown, setWindDownState] = useState(true);
  const [windLevel, setWindLevel] = useState(1);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const [p, c, w] = await Promise.all([
          AsyncStorage.getItem(PRESET_KEY),
          AsyncStorage.getItem(CUSTOM_KEY),
          AsyncStorage.getItem(WINDDOWN_KEY),
        ]);
        if (p) setPresetIdState(p);
        if (c) setCustomColorsState(JSON.parse(c));
        if (w !== null) setWindDownState(w === "1");
      } catch {}
    })();
  }, []);

  // Wind-down: a slow, deliberately unnoticeable fade. Stepping every
  // 5s rather than animating keeps this off the UI thread's hot path —
  // the blobs are already animating continuously.
  useEffect(() => {
    if (!windDown) {
      setWindLevel(1);
      return;
    }
    openedAt.current = Date.now();
    setWindLevel(1);
    const timer = setInterval(() => {
      const elapsed = Date.now() - openedAt.current;
      const t = Math.min(1, elapsed / WIND_DOWN_MS);
      setWindLevel(1 - t * (1 - WIND_DOWN_FLOOR));
      if (t >= 1) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [windDown]);

  const setPresetId = (id: string) => {
    setPresetIdState(id);
    AsyncStorage.setItem(PRESET_KEY, id).catch(() => {});
  };
  const setCustomColors = (colors: string[]) => {
    setCustomColorsState(colors);
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(colors)).catch(() => {});
  };
  const setWindDown = (on: boolean) => {
    setWindDownState(on);
    AsyncStorage.setItem(WINDDOWN_KEY, on ? "1" : "0").catch(() => {});
  };

  const preset =
    presetId === "custom"
      ? buildCustomPreset(customColors)
      : BACKDROP_PRESETS.find((p) => p.id === presetId) ?? BACKDROP_PRESETS[0];

  const level = stageDark ? 0 : windLevel;

  return (
    <BackdropContext.Provider
      value={{
        preset,
        presetId,
        setPresetId,
        customColors,
        setCustomColors,
        level,
        stageDark,
        setStageDark: setStageDarkState,
        windDown,
        setWindDown,
      }}
    >
      {children}
    </BackdropContext.Provider>
  );
}

/** Safe outside the provider (returns the default aurora, full brightness). */
export function useBackdrop(): BackdropValue {
  const ctx = useContext(BackdropContext);
  if (ctx) return ctx;
  return {
    preset: BACKDROP_PRESETS[0],
    presetId: "aurora",
    setPresetId: () => {},
    customColors: [],
    setCustomColors: () => {},
    level: 1,
    stageDark: false,
    setStageDark: () => {},
    windDown: false,
    setWindDown: () => {},
  };
}
