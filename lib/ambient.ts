import { Audio } from "expo-av";

// ─── Ambient sound catalog ─────────────────────────────────
// Each entry maps to a bundled asset in assets/audio/.
// "silence" is a virtual entry — no audio is loaded.

export type AmbientSoundId =
  | "silence"
  | "theta-binaural"
  | "soft-rain";

export type AmbientSoundEntry = {
  id: AmbientSoundId;
  label: string;
  description: string;
  icon: string; // Ionicons name
};

export const AMBIENT_SOUNDS: AmbientSoundEntry[] = [
  {
    id: "silence",
    label: "Silence",
    description: "Voice only — no background sound",
    icon: "volume-mute-outline",
  },
  {
    id: "theta-binaural",
    label: "Theta Binaural",
    description: "Low binaural hum at 6 Hz — matches the theta brain state",
    icon: "radio-outline",
  },
  {
    id: "soft-rain",
    label: "Soft Rain",
    description: "Gentle pink noise that sounds like distant rain",
    icon: "rainy-outline",
  },
];

const AMBIENT_ASSETS: Record<string, any> = {
  "theta-binaural": require("../assets/audio/ambient-theta.wav"),
  "soft-rain": require("../assets/audio/ambient-noise.wav"),
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
