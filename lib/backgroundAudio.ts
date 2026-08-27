import { AppState, AppStateStatus } from "react-native";
import { setAudioModeAsync } from "expo-audio";

// ─── Background audio lifecycle ────────────────────────────
// This module ensures audio keeps playing when the app is backgrounded,
// the screen is locked, or the user switches to another app.
// It must be initialized once at app startup (before any playback begins).

let initialized = false;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let wasPlayingBeforeInterruption = false;

// Callback so the playback engine can tell us its state
let getIsPlaying: (() => boolean) | null = null;
let onResumeAfterInterruption: (() => void) | null = null;

/**
 * Register callbacks from the audio playback engine so we can
 * coordinate interruption recovery.
 */
export function registerPlaybackCallbacks(callbacks: {
  getIsPlaying: () => boolean;
  onResume: () => void;
}) {
  getIsPlaying = callbacks.getIsPlaying;
  onResumeAfterInterruption = callbacks.onResume;
}

/**
 * Configure the audio session for reliable background playback.
 *
 * - iOS: Sets the audio category to Playback (not the default Ambient),
 *   which keeps audio alive through lock screen, app switch, and silent mode.
 *   DuckOthers lets alarm audio coexist briefly with other apps.
 *
 * - Android: Sets DUCK_OTHERS so the session can coexist with navigation
 *   or brief system sounds without being killed.
 */
async function configureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // DuckOthers on both platforms (expo-audio unifies the old
    // per-platform interruption-mode settings into one field)
    interruptionMode: "duckOthers",
    shouldRouteThroughEarpiece: false,
  });
}

/**
 * Handle transitions between foreground and background.
 *
 * When the app returns to the foreground after being backgrounded,
 * re-assert the audio mode. Some iOS versions reset the audio session
 * category when the app is suspended for a long period.
 */
function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === "active") {
    // Re-assert audio configuration when foregrounding
    configureAudioMode().catch(() => {});
  } else if (nextState === "background" || nextState === "inactive") {
    // Track whether audio was playing when we went to background
    // so we can decide whether to resume after an interruption
    if (getIsPlaying) {
      wasPlayingBeforeInterruption = getIsPlaying();
    }
  }
}

/**
 * Initialize background audio support. Call once in the root layout.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initBackgroundAudio(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Configure the audio session immediately — before any playback begins.
  // This ensures iOS allocates the correct audio category from the start,
  // rather than defaulting to Ambient and switching mid-session.
  await configureAudioMode();

  // Listen for app state transitions to re-assert audio config
  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
}

/**
 * Notify that an audio interruption ended (e.g. phone call finished).
 * If audio was playing before the interruption, resume it.
 */
export function handleInterruptionEnded(): void {
  if (wasPlayingBeforeInterruption && onResumeAfterInterruption) {
    // Small delay to let the audio session fully reactivate
    setTimeout(() => {
      onResumeAfterInterruption?.();
    }, 300);
    wasPlayingBeforeInterruption = false;
  }
}

/**
 * Clean up listeners. Normally never called (background audio lives
 * for the app's entire lifetime), but available for testing.
 */
export function teardownBackgroundAudio(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
  initialized = false;
  getIsPlaying = null;
  onResumeAfterInterruption = null;
}
