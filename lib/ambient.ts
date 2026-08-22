import { Audio } from "expo-av";

// ─── Ambient sound catalog ─────────────────────────────────
// Each entry maps to a bundled asset in assets/audio/.
// "silence" is a virtual entry — no audio is loaded.

export type AmbientSoundId =
  | "silence"
  | "theta-binaural"
  | "dawn-birds"
  | "river"
  | "ocean-waves"
  | "rain"
  | "crickets-night";

export type AmbientSoundEntry = {
  id: AmbientSoundId;
  label: string;
  description: string;
  icon: string; // Ionicons name
};

// Nature recordings are public-domain field recordings — sources and
// licenses documented in ATTRIBUTIONS.md.
export const AMBIENT_SOUNDS: AmbientSoundEntry[] = [
  {
    id: "silence",
    label: "Silence",
    description: "Voice only — no background sound",
    icon: "volume-mute-outline",
  },
  {
    id: "dawn-birds",
    label: "Dawn Chorus",
    description: "Early morning birdsong over a running brook",
    icon: "sunny-outline",
  },
  {
    id: "river",
    label: "River",
    description: "A steady river flowing over stones",
    icon: "leaf-outline",
  },
  {
    id: "ocean-waves",
    label: "Ocean Waves",
    description: "Waves breaking on a rocky Chilean shore",
    icon: "water-outline",
  },
  {
    id: "rain",
    label: "Rain on Leaves",
    description: "Soft rain falling through a forest canopy",
    icon: "rainy-outline",
  },
  {
    id: "crickets-night",
    label: "Night Crickets",
    description: "Warm evening crickets under a clear sky",
    icon: "moon-outline",
  },
  {
    id: "theta-binaural",
    label: "Theta Binaural",
    description: "Low binaural hum at 6 Hz — matches the theta brain state",
    icon: "radio-outline",
  },
];

export const AMBIENT_ASSETS: Record<string, any> = {
  "theta-binaural": require("../assets/audio/ambient-theta.wav"),
  "dawn-birds": require("../assets/audio/ambient-dawn-birds.m4a"),
  "river": require("../assets/audio/ambient-river.m4a"),
  "ocean-waves": require("../assets/audio/ambient-ocean.m4a"),
  "rain": require("../assets/audio/ambient-rain.m4a"),
  "crickets-night": require("../assets/audio/ambient-crickets.m4a"),
};

// ─── Ambient playback engine ───────────────────────────────
// Manages a looping ambient sound that layers under the voice track.
// Voice runs at 100% volume; ambient runs at AMBIENT_VOLUME (20%).

const AMBIENT_VOLUME = 0.20;

let ambientSound: Audio.Sound | null = null;
let currentAmbientId: AmbientSoundId | null = null;

/** Start the ambient loop for the given sound ID. No-ops for "silence". */
export async function startAmbient(id: AmbientSoundId): Promise<void> {
  await stopAmbient();
  currentAmbientId = id;

  if (id === "silence") return;

  const asset = AMBIENT_ASSETS[id];
  if (!asset) return;

  const { sound } = await Audio.Sound.createAsync(asset, {
    shouldPlay: true,
    isLooping: true,
    volume: AMBIENT_VOLUME,
  });

  ambientSound = sound;
}

/** Pause the ambient loop (e.g. when the user pauses the session). */
export async function pauseAmbient(): Promise<void> {
  if (ambientSound) {
    try { await ambientSound.pauseAsync(); } catch {}
  }
}

/** Resume the ambient loop. */
export async function resumeAmbient(): Promise<void> {
  if (ambientSound) {
    try { await ambientSound.playAsync(); } catch {}
  }
}

/** Stop and unload the ambient loop. */
export async function stopAmbient(): Promise<void> {
  if (ambientSound) {
    try {
      await ambientSound.stopAsync();
      await ambientSound.unloadAsync();
    } catch {}
    ambientSound = null;
    currentAmbientId = null;
  }
}

/** Get the currently playing ambient sound ID, or null if none. */
export function getActiveAmbientId(): AmbientSoundId | null {
  return currentAmbientId;
}
