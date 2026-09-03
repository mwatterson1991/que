/**
 * Habit accent colours. A habit's colour is data — it is stored on the row
 * and shown wherever the habit appears — not chrome, so it lives here rather
 * than in lib/tokens.ts. Screens read the array; they never spell a hex.
 *
 * These are Apple's dark-mode system colours, so a habit chip sits beside
 * the rest of the app's tint without a seam.
 */
export const PRESET_COLORS: readonly string[] = [
  "#FF9F0A", // systemOrange
  "#BF5AF2", // systemPurple
  "#0A84FF", // systemBlue
  "#30D158", // systemGreen
  "#FF375F", // systemPink
  "#64D2FF", // systemTeal
  "#FFD60A", // systemYellow
  "#FF453A", // systemRed
];
