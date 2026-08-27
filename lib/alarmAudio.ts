import { createAudioPlayer, AudioPlayer } from "expo-audio";
import {
  resolveSource,
  configureAudio,
  stopSession,
  adoptSession,
  setPlayerStatusCallback,
  releasePlayer,
  PlaybackSource,
  BUNDLED_ASSETS,
  SessionStatusCallback,
} from "./audio";

// ─── Constants ─────────────────────────────────────────────
const FADE_DURATION_MS = 30_000; // 30-second fade from silence to full volume
const FADE_STEP_MS = 500; // update volume every 500ms
const FADE_STEPS = FADE_DURATION_MS / FADE_STEP_MS;
const PRELOAD_TIMEOUT_MS = 10_000; // give up preloading after 10s
const DEFAULT_FALLBACK_KEY = "morning-confidence"; // bundled asset used when primary fails

// ─── State ─────────────────────────────────────────────────
let alarmPlayer: AudioPlayer | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;
let preloadedPlayer: AudioPlayer | null = null;
let preloadedSourceKey: string | null = null;

// ─── Loading helper ────────────────────────────────────────

/**
 * Wait until a player has finished loading its source, or the timeout
 * elapses. The old Sound.createAsync resolved/rejected on load completion;
 * expo-audio loads in the background, so we poll `isLoaded` to recreate
 * the same "loaded or failed" decision point.
 */
function waitForLoaded(player: AudioPlayer, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const poll = setInterval(() => {
      let loaded = false;
      try {
        loaded = player.isLoaded;
      } catch {
        // Player was released while we waited
        clearInterval(poll);
        resolve(false);
        return;
      }
      if (loaded) {
        clearInterval(poll);
        resolve(true);
      } else if (Date.now() - started >= timeoutMs) {
        clearInterval(poll);
        resolve(false);
      }
    }, 100);
  });
}

// ─── Volume fade-in ────────────────────────────────────────

/** Gradually raise volume from 0 → 1 over FADE_DURATION_MS. */
function startVolumeFade(player: AudioPlayer): void {
  let step = 0;
  clearFadeInterval();

  fadeInterval = setInterval(() => {
    step++;
    const volume = Math.min(1, step / FADE_STEPS);
    try {
      player.volume = volume;
    } catch {
      // Player may have been released — stop fading
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
  if (preloadedPlayer && preloadedSourceKey === sourceKey) return true;

  // Clean up any previous preload
  await clearPreload();

  try {
    await configureAudio();
    const audioSource =
      source.type === "url" ? { uri: source.uri } : BUNDLED_ASSETS[source.key];

    if (!audioSource) return false;

    const player = createAudioPlayer(audioSource, { updateInterval: 500 });
    player.volume = 0;

    const loaded = await waitForLoaded(player, PRELOAD_TIMEOUT_MS);
    if (!loaded) {
      releasePlayer(player);
      return false;
    }

    preloadedPlayer = player;
    preloadedSourceKey = sourceKey;
    return true;
  } catch (err) {
    console.warn("[alarmAudio] preload failed:", err);
    return false;
  }
}

async function clearPreload(): Promise<void> {
  if (preloadedPlayer) {
    releasePlayer(preloadedPlayer);
    preloadedPlayer = null;
    preloadedSourceKey = null;
  }
}

// ─── Alarm playback ────────────────────────────────────────

/**
 * Play a session as an alarm with gentle volume fade-in and error fallback.
 *
 * This is the primary entry point when an alarm fires. It:
 * 1. Uses a preloaded player if available, otherwise loads fresh
 * 2. Starts at volume 0 and fades to full over 30 seconds
 * 3. Falls back to a bundled default session if the primary source fails
 *
 * Returns the player instance, or null if everything failed.
 */
export async function playAlarmSession(
  audioUrl: string | null,
  audioAsset: string | null,
  statusCallback?: SessionStatusCallback,
): Promise<AudioPlayer | null> {
  // Stop any existing alarm or regular playback
  await stopAlarmSession();
  await stopSession();
  await configureAudio();

  const source = resolveSource(audioUrl, audioAsset);

  // Try primary source
  let player = await tryLoadAndPlay(source, statusCallback);

  // If primary failed, try fallback
  if (!player && source) {
    console.warn("[alarmAudio] primary source failed, trying fallback");
    const fallback: PlaybackSource = { type: "asset", key: DEFAULT_FALLBACK_KEY };
    player = await tryLoadAndPlay(fallback, statusCallback);
  }

  // If we still have no player and didn't try fallback yet (source was null)
  if (!player) {
    console.warn("[alarmAudio] no source resolved, using fallback");
    const fallback: PlaybackSource = { type: "asset", key: DEFAULT_FALLBACK_KEY };
    player = await tryLoadAndPlay(fallback, statusCallback);
  }

  if (!player) {
    console.error("[alarmAudio] all sources failed — alarm is silent");
    return null;
  }

  alarmPlayer = player;
  // Register with the main engine so the player's pause/resume/seek
  // transport controls operate on the alarm sound too.
  adoptSession(player, statusCallback);
  startVolumeFade(player);
  return player;
}

async function tryLoadAndPlay(
  source: PlaybackSource | null,
  statusCallback?: SessionStatusCallback,
): Promise<AudioPlayer | null> {
  if (!source) return null;

  const sourceKey = source.type === "url" ? source.uri : source.key;

  // Use preloaded player if it matches
  if (preloadedPlayer && preloadedSourceKey === sourceKey) {
    const player = preloadedPlayer;
    preloadedPlayer = null;
    preloadedSourceKey = null;

    try {
      player.volume = 0;
      if (statusCallback) {
        setPlayerStatusCallback(player, statusCallback);
      }
      player.play();
      return player;
    } catch (err) {
      console.warn("[alarmAudio] preloaded player failed to play:", err);
      releasePlayer(player);
      // Fall through to fresh load
    }
  }

  // Fresh load
  try {
    const audioSource =
      source.type === "url" ? { uri: source.uri } : BUNDLED_ASSETS[source.key];

    if (!audioSource) return null;

    const player = createAudioPlayer(audioSource, { updateInterval: 500 });
    player.volume = 0;

    const loaded = await waitForLoaded(player, PRELOAD_TIMEOUT_MS);
    if (!loaded) {
      console.warn("[alarmAudio] source failed to load:", sourceKey);
      releasePlayer(player);
      return null;
    }

    if (statusCallback) {
      setPlayerStatusCallback(player, statusCallback);
    }

    player.play();
    return player;
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

  // The alarm player is adopted as the main engine's current session,
  // so stopSession() stops and releases it there too.
  await stopSession();

  if (alarmPlayer) {
    releasePlayer(alarmPlayer);
    alarmPlayer = null;
  }
}

/** Check if an alarm is currently playing. */
export function isAlarmPlaying(): boolean {
  return alarmPlayer !== null;
}

/**
 * Immediately set alarm audio to full volume.
 * Useful if the user interacts with the app (taps dismiss/snooze)
 * and the fade-in should be skipped.
 */
export async function skipFadeIn(): Promise<void> {
  clearFadeInterval();
  if (alarmPlayer) {
    try {
      alarmPlayer.volume = 1;
    } catch {}
  }
}
