/**
 * Design tokens for the Que app.
 *
 * These are the authoritative values for typography, spacing, and color.
 * Use these constants in StyleSheet.create() calls rather than raw numbers.
 *
 * Font families live in lib/fonts.ts (the F object).
 */

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Font size scale.
 *
 *  xs    11  stat labels, skip counter, chart axis labels
 *  sm    13  section titles (uppercase), version text, category meta
 *  base  15  subtitles, secondary labels, empty-state copy, settings values
 *  md    16  body text, form inputs, list row labels, chat bubbles
 *  lg    17  nav header title, Save/action buttons in header
 *  xl    18  card titles (Create screen), mantra caption text
 *  2xl   20  session titles (Search/Sounds), time-picker digits
 *  3xl   24  drawer nav items, alarm AM/PM indicator
 *  4xl   28  stats (streak, sessions, hours)
 *  5xl   32  Auth screen logo (Lora serif)
 *  ---   50  Profile-page score display (editorial/light)
 *  ---   56  Alarm list time digits (display number)
 *  ---   72  Profile drawer score (bold hero number)
 */
export const FS = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 17,
  xl: 18,
  "2xl": 20,
  "3xl": 24,
  "4xl": 28,
  "5xl": 32,
} as const;

// ─── Line heights ────────────────────────────────────────────────────────────

export const LH = {
  tight: 18,   // xs/sm labels
  snug: 20,    // base secondary text
  normal: 22,  // md body text, chat bubbles
  relaxed: 26, // xl mantra / session descriptions
} as const;

// ─── Letter spacing ──────────────────────────────────────────────────────────

export const LS = {
  tight: -3,    // hero score numbers
  snug: -2,     // large display numbers (alarm time)
  normal: 0,
  wide: 1,      // stat labels
  wider: 1.5,   // section titles (UPPERCASE)
  widest: 2,    // player "NOW PLAYING" label, button labels
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

/**
 * Screen-level horizontal padding used consistently across all screens.
 *
 *  screenPad   20  content scrollviews, card layouts
 *  listPad     16  flat-list containers that need tighter gutters
 *  inputPad    24  form/auth screens with more breathing room
 */
export const SPACE = {
  screenPad: 20,
  listPad: 16,
  inputPad: 24,
  screenPadTop: 16,    // content top gap below native header
  formPadTop: 24,      // form screens (edit-profile, edit-email)
  sectionGap: 20,      // vertical gap between major page sections
} as const;

// ─── Colors ──────────────────────────────────────────────────────────────────

/**
 * Semantic color aliases.
 * Raw hex values also live in tailwind.config.js for NativeWind classes.
 */
export const C = {
  bg: "#0b0b0f",          // main app background (chat, forms, headers)
  bgDeep: "#000000",      // content screens (alarms, search, player, auth)
  panel: "#15151c",       // cards, raised surfaces
  panelMid: "#1c1c1e",   // input backgrounds, search bars, chart cards
  panelHigh: "#2c2c2e",  // active bubbles, dark buttons

  border: "#27272a",      // card borders, separators
  borderFaint: "#1c1c1e", // hairline separators between list rows
  borderMid: "#3f3f46",   // pill borders, inactive states

  fg: "#f5f5f7",          // primary text, icons
  fgMid: "#a1a1aa",       // secondary icons
  fgDim: "#71717a",       // secondary text, labels, timestamps
  fgFaint: "#52525b",     // placeholder, disabled text

  accent: "#a78bfa",      // brand accent (purple)
  success: "#22c55e",     // score delta, chart line, completion
  alarm: "#ff9f0a",       // alarm/mic button
  danger: "#ff3b30",      // destructive actions

  switchOn: "#4cd964",
} as const;
