import { Audio, AVPlaybackStatus } from "expo-av";

// ─── Bundled audio assets ───────────────────────────────
// Maps audio_asset keys (from the sessions table) to local require() sources.
export const BUNDLED_ASSETS: Record<string, any> = {
  "deep-sleep": require("../assets/audio/deep-sleep.aiff"),
  "morning-confidence": require("../assets/audio/tts_2026-05-20T10-06-22-531Z.mp3"),
  "quit-vaping": require("../assets/audio/quit-vaping.aiff"),
  "stop-scrolling": require("../assets/audio/stop-scrolling.aiff"),
  "overeating-reset": require("../assets/audio/overeating-reset.aiff"),
  "circadian-reset": require("../assets/audio/circadian-reset.aiff"),
  "improve-focus": require("../assets/audio/improve-focus.aiff"),
  "gratitude-flood": require("../assets/audio/gratitude-flood.aiff"),
  "worry-dissolve": require("../assets/audio/worry-dissolve.aiff"),
  "panic-relief": require("../assets/audio/panic-relief.aiff"),
  "self-worth": require("../assets/audio/self-worth.aiff"),
  // Naturescape soundscapes (also used by the ambient layer)
  "ambient-dawn-birds": require("../assets/audio/ambient-dawn-birds.m4a"),
  "ambient-river": require("../assets/audio/ambient-river.m4a"),
  "ambient-ocean-waves": require("../assets/audio/ambient-ocean.m4a"),
  "ambient-rain": require("../assets/audio/ambient-rain.m4a"),
  "ambient-crickets": require("../assets/audio/ambient-crickets.m4a"),
};

// ─── Audio playback engine ──────────────────────────────
let currentSound: Audio.Sound | null = null;
let onStatusUpdate: ((status: AVPlaybackStatus) => void) | null = null;

/** Configure the audio session for background/silent-mode playback */
export async function configureAudio() {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
  });
}

export type PlaybackSource =
  | { type: "asset"; key: string }   // bundled asset key
  | { type: "url"; uri: string };    // remote URL

/** Resolve a session's audio source from its audio_url / audio_asset fields */
export function resolveSource(
  audioUrl: string | null,
  audioAsset: string | null,
): PlaybackSource | null {
  if (audioUrl) return { type: "url", uri: audioUrl };
  if (audioAsset && BUNDLED_ASSETS[audioAsset]) return { type: "asset", key: audioAsset };
  return null;
}

/** Start playing audio. Returns the Sound instance. */
export async function playSession(
  source: PlaybackSource,
  statusCallback?: (status: AVPlaybackStatus) => void,
): Promise<Audio.Sound | null> {
  await stopSession();
  await configureAudio();

  onStatusUpdate = statusCallback ?? null;

  const avSource =
    source.type === "url"
      ? { uri: source.uri }
      : BUNDLED_ASSETS[source.key];

  if (!avSource) {
    console.warn("[audio] No audio source found");
    return null;
  }

  const { sound } = await Audio.Sound.createAsync(avSource, {
    shouldPlay: true,
    progressUpdateIntervalMillis: 500,
  });

  currentSound = sound;

  if (onStatusUpdate) {
    sound.setOnPlaybackStatusUpdate(onStatusUpdate);
  }

  return sound;
}

/**
 * Adopt an externally-created Sound as the current session so that
 * pauseSession/resumeSession/seekSession/stopSession operate on it.
 * Used by alarmAudio, which manages its own loading/fade but should
 * still respond to the player's transport controls.
 */
export function adoptSession(
  sound: Audio.Sound,
  statusCallback?: (status: AVPlaybackStatus) => void,
) {
  currentSound = sound;
  onStatusUpdate = statusCallback ?? null;
  if (onStatusUpdate) sound.setOnPlaybackStatusUpdate(onStatusUpdate);
}

/** Pause current playback */
export async function pauseSession() {
  if (currentSound) {
    await currentSound.pauseAsync();
  }
}

/** Resume current playback */
export async function resumeSession() {
  if (currentSound) {
    await currentSound.playAsync();
  }
}

/** Seek to a position (in milliseconds) */
export async function seekSession(positionMs: number) {
  if (currentSound) {
    await currentSound.setPositionAsync(positionMs);
  }
}

/** Stop and unload current audio */
export async function stopSession() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
    onStatusUpdate = null;
  }
}

/** Get whether audio is currently loaded */
export function hasActiveSession(): boolean {
  return currentSound !== null;
}
