import { createAudioPlayer, AudioPlayer } from "expo-audio";
import { releasePlayer, fadePlayerTo } from "./audio";

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
    label: "First Light",
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

let ambientPlayer: AudioPlayer | null = null;
let currentAmbientId: AmbientSoundId | null = null;

/** Start the ambient loop for the given sound ID. No-ops for "silence". */
export async function startAmbient(id: AmbientSoundId): Promise<void> {
  await stopAmbient();
  currentAmbientId = id;

  if (id === "silence") return;

  const asset = AMBIENT_ASSETS[id];
  if (!asset) return;

  const player = createAudioPlayer(asset);
  player.loop = true;
  player.volume = 0;
  player.play();
  fadePlayerTo(player, AMBIENT_VOLUME, 2000);

  ambientPlayer = player;
}

/** Pause the ambient loop (e.g. when the user pauses the session). */
export async function pauseAmbient(): Promise<void> {
  if (ambientPlayer) {
    try { ambientPlayer.pause(); } catch {}
  }
}

/** Resume the ambient loop. */
export async function resumeAmbient(): Promise<void> {
  if (ambientPlayer) {
    try { ambientPlayer.play(); } catch {}
  }
}

/** Stop and unload the ambient loop. */
export async function stopAmbient(): Promise<void> {
  if (ambientPlayer) {
    releasePlayer(ambientPlayer);
    ambientPlayer = null;
    currentAmbientId = null;
  }
}

/** Get the currently playing ambient sound ID, or null if none. */
export function getActiveAmbientId(): AmbientSoundId | null {
  return currentAmbientId;
}
