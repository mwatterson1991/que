import type { TextStyle } from "react-native";

/**
 * Design tokens for Morning Que.
 *
 * The app follows Apple's Human Interface Guidelines for a dark-only
 * app, and borrows the Clock app's structure. Every value below is
 * either Apple's own dark-mode system value or derived from one, so the
 * app sits beside Apple's apps without a seam.
 *
 * Rules:
 *   - No screen file contains a hex code, a font size or a font family.
 *     Colour comes from `C`, type from `TYPE` (or the <Txt> primitive),
 *     spacing from `SP`, radii from `R`.
 *   - One accent: white. Actions, tint, selection ticks, the active tab
 *     and nav glyphs are all white on black. The native Switch keeps
 *     Apple's green, because that is what a switch looks like on iOS.
 *   - No shadows, no gradients. Depth is a lighter fill. Liquid glass is
 *     allowed in exactly three places: the floating tab bar, the sound
 *     cards and the player.
 */

// ─── Colour (Apple dark-mode system palette) ─────────────────────────────────

export const C = {
  /** systemBackground */
  bg: "#000000",
  /** secondarySystemGroupedBackground — grouped list cells, sheets, the dock */
  fill: "#1C1C1E",
  /** tertiarySystemBackground — pressed cell, gray button, wheel band */
  fillHigh: "#2C2C2E",
  /** systemFill-ish — switch-off track, scrub track, disabled fills */
  fillHighest: "#3A3A3C",

  /** separator (dark) */
  separator: "rgba(84,84,88,0.6)",

  /** label */
  label: "#FFFFFF",
  /** secondaryLabel */
  labelSecondary: "rgba(235,235,245,0.6)",
  /** tertiaryLabel */
  labelTertiary: "rgba(235,235,245,0.3)",
  /** quaternaryLabel */
  labelQuaternary: "rgba(235,235,245,0.18)",

  /** White. Tint colour: nav glyphs, prominent buttons, links, progress, selection ticks, the active tab. */
  accent: "#FFFFFF",
  /** Label on an accent (white) fill. */
  onAccent: "#000000",
  /** systemRed (dark). Destructive only. */
  danger: "#FF453A",
  /** systemGreen (dark). The native Switch's on-state only. */
  switchOn: "#30D158",

  /** A flat veil over full-bleed artwork so text on it stays legible. */
  scrim: "rgba(0,0,0,0.45)",
  /** Chrome (back button disc, pill) placed over artwork. */
  overlayFill: "rgba(28,28,30,0.72)",

  /** Tint for a `regular` glass bubble (the active-tab highlight). */
  glassTint: "rgba(255,255,255,0.22)",
  /** Fallback ground for a `clear` glass surface where liquid glass is unavailable (Android, iOS < 26). */
  glassFallback: "rgba(28,28,30,0.82)",
} as const;

// ─── Type (iOS text styles, system font) ─────────────────────────────────────

const tabular: TextStyle = { fontVariant: ["tabular-nums"] };

/**
 * Apple's Dynamic Type "Large" (default) sizes. The system font is used
 * so the app renders in San Francisco on iOS and Roboto on Android, with
 * no font files to load.
 */
export const TYPE = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.4 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.4 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.4 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.3 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.2 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.1 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: "400", letterSpacing: 0.06 },

  /** Wheel-picker digits (UIPickerView is 23pt regular). */
  picker: { fontSize: 23, lineHeight: 28, fontWeight: "400", letterSpacing: 0, ...tabular },
  /** Alarm-list time. Clock app: light weight, tight, tabular. */
  clock: { fontSize: 52, lineHeight: 60, fontWeight: "300", letterSpacing: -1, ...tabular },
  /** The time on a ringing / wake screen. */
  clockHero: { fontSize: 96, lineHeight: 104, fontWeight: "200", letterSpacing: -3, ...tabular },
  /** Editorial statement text (welcome, wind-down lines). */
  editorial: { fontSize: 34, lineHeight: 40, fontWeight: "600", letterSpacing: -0.6 },
  /** Big stat numbers. */
  stat: { fontSize: 44, lineHeight: 50, fontWeight: "300", letterSpacing: -1, ...tabular },
} as const satisfies Record<string, TextStyle>;

export type TypeKind = keyof typeof TYPE;

/** Numeric sizes, for the few places that need a number (icon sizing next to text). */
export const T = {
  caption: 12,
  footnote: 13,
  subheadline: 15,
  body: 17,
  title3: 20,
  title2: 22,
  title1: 28,
  largeTitle: 34,
  stat: 44,
  clock: 52,
  clockHero: 96,
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  /** Apple's standard layout margin and cell inset. */
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  /** Screen-level horizontal padding = layout margin. */
  screen: 16,
  /** Minimum row height. Meatier than UIKit's 44: the cells are the app's main surface. */
  row: 56,
  /** Vertical padding inside a row. */
  rowY: 14,
  /** Minimum tappable control. */
  hit: 44,
  /** Height of a text field / search field. */
  field: 52,
  /** Height of a Button. */
  button: 54,
} as const;

// ─── Radii ───────────────────────────────────────────────────────────────────

export const R = {
  /** Small controls, thumbnails. */
  sm: 8,
  /** Grouped list cards. */
  md: 14,
  /** Text fields, search fields. */
  field: 16,
  /** Buttons, sheets. */
  lg: 18,
  /** Large artwork tiles. */
  xl: 20,
  pill: 999,
} as const;

// ─── Motion ──────────────────────────────────────────────────────────────────

/** Press feedback for custom pressables: opacity dip, like UIKit's highlighted state. */
export const PRESS_OPACITY = 0.55;
