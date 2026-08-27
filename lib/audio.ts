import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from "expo-audio";

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
  "theta-binaural": require("../assets/audio/ambient-theta.wav"),
  // Naturescape soundscapes (also used by the ambient layer)
  "ambient-dawn-birds": require("../assets/audio/ambient-dawn-birds.m4a"),
  "ambient-river": require("../assets/audio/ambient-river.m4a"),
  "ambient-ocean-waves": require("../assets/audio/ambient-ocean.m4a"),
  "ambient-rain": require("../assets/audio/ambient-rain.m4a"),
  "ambient-crickets": require("../assets/audio/ambient-crickets.m4a"),
  // Frequencies
  "freq-alpha": require("../assets/audio/freq-alpha.m4a"),
  "freq-delta": require("../assets/audio/freq-delta.m4a"),
  // Horoscope + Positive Words (placeholder voice — regenerate via ElevenLabs)
  "horo-star": require("../assets/audio/horo-star.m4a"),
  "horo-cosmic": require("../assets/audio/horo-cosmic.m4a"),
  "horo-moon": require("../assets/audio/horo-moon.m4a"),
  "words-affirm": require("../assets/audio/words-affirm.m4a"),
  "words-grace": require("../assets/audio/words-grace.m4a"),
  "words-stoic": require("../assets/audio/words-stoic.m4a"),
};

// ─── Playback status (legacy AVPlaybackStatus-style shape) ──
// expo-audio reports time in SECONDS; this module converts to the
// millisecond-based shape callers were written against, so screens
// keep working unchanged.
export type SessionPlaybackStatus = {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis?: number;
  didJustFinish: boolean;
};

export type SessionStatusCallback = (status: SessionPlaybackStatus) => void;

export function toSessionStatus(status: AudioStatus): SessionPlaybackStatus {
  return {
    isLoaded: status.isLoaded,
    isPlaying: status.playing,
    positionMillis: Math.round(status.currentTime * 1000),
    durationMillis:
      status.duration > 0 ? Math.round(status.duration * 1000) : undefined,
    didJustFinish: status.didJustFinish,
  };
}

// ─── Per-player status listener bookkeeping ─────────────
// The old setOnPlaybackStatusUpdate REPLACED the previous callback;
// expo-audio's addListener ADDS one. Track subscriptions per player so
// re-attaching behaves like a replace and never double-fires.
type Subscription = { remove: () => void };
const statusSubscriptions = new WeakMap<AudioPlayer, Subscription>();

/** Attach (or replace) the status callback on a player. */
export function setPlayerStatusCallback(
  player: AudioPlayer,
  callback: SessionStatusCallback | null,
): void {
  statusSubscriptions.get(player)?.remove();
  statusSubscriptions.delete(player);
  if (callback) {
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      callback(toSessionStatus(status));
    });
    statusSubscriptions.set(player, sub);
  }
}

/** Stop, detach listeners, and release a player's native resources. */
export function releasePlayer(player: AudioPlayer): void {
  setPlayerStatusCallback(player, null);
  try {
    player.pause();
  } catch {}
  try {
    player.remove();
  } catch {}
}

// ─── Audio playback engine ──────────────────────────────
let currentPlayer: AudioPlayer | null = null;

/** Configure the audio session for background/silent-mode playback */
export async function configureAudio() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // shouldDuckAndroid: true equivalent → duck other apps' audio
    interruptionMode: "duckOthers",
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

/** Start playing audio. Returns the player instance. */
export async function playSession(
  source: PlaybackSource,
  statusCallback?: SessionStatusCallback,
): Promise<AudioPlayer | null> {
  await stopSession();
  await configureAudio();

  const audioSource =
    source.type === "url"
      ? { uri: source.uri }
      : BUNDLED_ASSETS[source.key];

  if (!audioSource) {
    console.warn("[audio] No audio source found");
    return null;
  }

  const player = createAudioPlayer(audioSource, { updateInterval: 500 });
  currentPlayer = player;

  if (statusCallback) {
    setPlayerStatusCallback(player, statusCallback);
  }

  player.play();
  return player;
}

/**
 * Adopt an externally-created player as the current session so that
 * pauseSession/resumeSession/seekSession/stopSession operate on it.
 * Used by alarmAudio, which manages its own loading/fade but should
 * still respond to the player's transport controls.
 */
export function adoptSession(
  player: AudioPlayer,
  statusCallback?: SessionStatusCallback,
) {
  currentPlayer = player;
  if (statusCallback) setPlayerStatusCallback(player, statusCallback);
}

/** Pause current playback */
export async function pauseSession() {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
    } catch {}
  }
}

/** Resume current playback */
export async function resumeSession() {
  if (currentPlayer) {
    try {
      currentPlayer.play();
    } catch {}
  }
}

/** Seek to a position (in milliseconds) */
export async function seekSession(positionMs: number) {
  if (currentPlayer) {
    try {
      await currentPlayer.seekTo(positionMs / 1000);
    } catch {}
  }
}

/** Stop and unload current audio */
export async function stopSession() {
  if (currentPlayer) {
    releasePlayer(currentPlayer);
    currentPlayer = null;
  }
}

/** Get whether audio is currently loaded */
export function hasActiveSession(): boolean {
  return currentPlayer !== null;
}
