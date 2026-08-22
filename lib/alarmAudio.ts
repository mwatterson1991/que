import { Audio, AVPlaybackStatus } from "expo-av";
import {
  resolveSource,
  configureAudio,
  stopSession,
  adoptSession,
  PlaybackSource,
  BUNDLED_ASSETS,
} from "./audio";

// ─── Constants ─────────────────────────────────────────────
const FADE_DURATION_MS = 30_000; // 30-second fade from silence to full volume
const FADE_STEP_MS = 500; // update volume every 500ms
const FADE_STEPS = FADE_DURATION_MS / FADE_STEP_MS;
const PRELOAD_TIMEOUT_MS = 10_000; // give up preloading after 10s
const DEFAULT_FALLBACK_KEY = "morning-confidence"; // bundled asset used when primary fails

// ─── State ─────────────────────────────────────────────────
let alarmSound: Audio.Sound | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;
let preloadedSound: Audio.Sound | null = null;
let preloadedSourceKey: string | null = null;

// ─── Volume fade-in ────────────────────────────────────────

/** Gradually raise volume from 0 → 1 over FADE_DURATION_MS. */
function startVolumeFade(sound: Audio.Sound): void {
  let step = 0;
  clearFadeInterval();

  fadeInterval = setInterval(async () => {
    step++;
    const volume = Math.min(1, step / FADE_STEPS);
    try {
      await sound.setVolumeAsync(volume);
    } catch {
      // Sound may have been unloaded — stop fading
      clearFadeInterval();
    }
    if (step >= FADE_STEPS) {
      clearFadeInterval();
    }
  }, FADE_STEP_MS);
}

function clearFadeInterval(): void {
  if (fadeInterval !== null) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
}

// ─── Preloading ────────────────────────────────────────────

/**
 * Preload an audio source into memory so playback starts instantly when the
 * alarm fires. Call this ~60 seconds before the scheduled alarm time.
 *
 * Returns true if preloading succeeded, false otherwise.
 */
export async function preloadAlarmAudio(
  audioUrl: string | null,
  audioAsset: string | null,
): Promise<boolean> {
  const source = resolveSource(audioUrl, audioAsset);
  if (!source) return false;

  const sourceKey = source.type === "url" ? source.uri : source.key;

  // Already preloaded this source
  if (preloadedSound && preloadedSourceKey === sourceKey) return true;

  // Clean up any previous preload
  await clearPreload();

  try {
    await configureAudio();
    const avSource =
      source.type === "url" ? { uri: source.uri } : BUNDLED_ASSETS[source.key];

    if (!avSource) return false;

    const loadPromise = Audio.Sound.createAsync(avSource, {
      shouldPlay: false,
      volume: 0,
      progressUpdateIntervalMillis: 500,
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), PRELOAD_TIMEOUT_MS),
    );

    const result = await Promise.race([loadPromise, timeoutPromise]);
    if (!result) return false;

    preloadedSound = result.sound;
    preloadedSourceKey = sourceKey;
    return true;
  } catch (err) {
    console.warn("[alarmAudio] preload failed:", err);
    return false;
  }
}

async function clearPreload(): Promise<void> {
  if (preloadedSound) {
    try {
      await preloadedSound.unloadAsync();
    } catch {}
    preloadedSound = null;
    preloadedSourceKey = null;
  }
}

// ─── Alarm playback ────────────────────────────────────────

/**
 * Play a session as an alarm with gentle volume fade-in and error fallback.
 *
 * This is the primary entry point when an alarm fires. It:
 * 1. Uses a preloaded sound if available, otherwise loads fresh
 * 2. Starts at volume 0 and fades to full over 30 seconds
 * 3. Falls back to a bundled default session if the primary source fails
 *
 * Returns the Sound instance, or null if everything failed.
 */
export async function playAlarmSession(
  audioUrl: string | null,
  audioAsset: string | null,
  statusCallback?: (status: AVPlaybackStatus) => void,
): Promise<Audio.Sound | null> {
  // Stop any existing alarm or regular playback
  await stopAlarmSession();
  await stopSession();
  await configureAudio();

  const source = resolveSource(audioUrl, audioAsset);

  // Try primary source
  let sound = await tryLoadAndPlay(source, statusCallback);

  // If primary failed, try fallback
  if (!sound && source) {
    console.warn("[alarmAudio] primary source failed, trying fallback");
    const fallback: PlaybackSource = { type: "asset", key: DEFAULT_FALLBACK_KEY };
    sound = await tryLoadAndPlay(fallback, statusCallback);
  }

  // If we still have no sound and didn't try fallback yet (source was null)
  if (!sound) {
    console.warn("[alarmAudio] no source resolved, using fallback");
    const fallback: PlaybackSource = { type: "asset", key: DEFAULT_FALLBACK_KEY };
    sound = await tryLoadAndPlay(fallback, statusCallback);
  }

  if (!sound) {
    console.error("[alarmAudio] all sources failed — alarm is silent");
    return null;
  }

  alarmSound = sound;
  // Register with the main engine so the player's pause/resume/seek
  // transport controls operate on the alarm sound too.
  adoptSession(sound, statusCallback);
  startVolumeFade(sound);
  return sound;
}

async function tryLoadAndPlay(
  source: PlaybackSource | null,
  statusCallback?: (status: AVPlaybackStatus) => void,
): Promise<Audio.Sound | null> {
  if (!source) return null;

  const sourceKey = source.type === "url" ? source.uri : source.key;

  // Use preloaded sound if it matches
  if (preloadedSound && preloadedSourceKey === sourceKey) {
    const sound = preloadedSound;
    preloadedSound = null;
    preloadedSourceKey = null;

    try {
      await sound.setVolumeAsync(0);
      if (statusCallback) {
        sound.setOnPlaybackStatusUpdate(statusCallback);
      }
      await sound.playAsync();
      return sound;
    } catch (err) {
      console.warn("[alarmAudio] preloaded sound failed to play:", err);
      try { await sound.unloadAsync(); } catch {}
      // Fall through to fresh load
    }
  }

  // Fresh load
  try {
    const avSource =
      source.type === "url" ? { uri: source.uri } : BUNDLED_ASSETS[source.key];

    if (!avSource) return null;

    const { sound } = await Audio.Sound.createAsync(avSource, {
      shouldPlay: true,
      volume: 0,
      progressUpdateIntervalMillis: 500,
    });

    if (statusCallback) {
      sound.setOnPlaybackStatusUpdate(statusCallback);
    }

    return sound;
  } catch (err) {
    console.warn("[alarmAudio] failed to load source:", err);
    return null;
  }
}

// ─── Alarm stop / snooze ───────────────────────────────────

/** Stop the alarm audio and clean up all resources. */
export async function stopAlarmSession(): Promise<void> {
  clearFadeInterval();
  await clearPreload();

  // The alarm sound is adopted as the main engine's current session,
  // so stopSession() stops and unloads it there too.
  await stopSession();

  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    } catch {}
    alarmSound = null;
  }
}

/** Check if an alarm is currently playing. */
export function isAlarmPlaying(): boolean {
  return alarmSound !== null;
}

/**
 * Immediately set alarm audio to full volume.
 * Useful if the user interacts with the app (taps dismiss/snooze)
 * and the fade-in should be skipped.
 */
export async function skipFadeIn(): Promise<void> {
  clearFadeInterval();
  if (alarmSound) {
    try {
      await alarmSound.setVolumeAsync(1);
    } catch {}
  }
}
