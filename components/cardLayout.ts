import { Dimensions } from "react-native";

// Card geometry lives here so the cards and the rails that snap them
// agree on a single set of numbers. Portrait-only app, so the window is
// measured once at module load rather than per-render — a rail's
// snapToInterval must be a stable constant or scrolling stutters.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** Left gutter of a rail (and both gutters of the search column). */
export const RAIL_EDGE = 16;
/** Gap between two cards in a rail. */
export const RAIL_GAP = 14;

// A rail shows exactly one card plus a sliver of the next, so it reads
// as a carousel you swipe rather than a grid that got cropped.
const PEEK = 0.14;

export const CARD_W = Math.round((SCREEN_W - RAIL_EDGE - RAIL_GAP) / (1 + PEEK));

// Tall-ish portrait card, but capped against screen height so one rail
// plus half of the next still fits on small devices.
export const CARD_H = Math.min(
  Math.round(CARD_W * 1.16),
  Math.round(SCREEN_H * 0.46),
);

/** One swipe = one card. FlatList snaps on multiples of this. */
export const SNAP_INTERVAL = CARD_W + RAIL_GAP;

// Trailing padding so the LAST card can still scroll flush to the left
// gutter — without it the final snap point is unreachable and the rail
// bounces back. Derived, not guessed: content must be at least a
// screen-width longer than the last card's snap offset.
export const RAIL_TAIL = Math.max(RAIL_EDGE, SCREEN_W - RAIL_EDGE - CARD_W);

// Search results are one full-width column: wider and shorter than a
// rail card so results stay scannable while still being image-forward.
export const WIDE_W = SCREEN_W - RAIL_EDGE * 2;
export const WIDE_H = Math.round(WIDE_W * 0.62);

// Optional at runtime — a dev client without the module must not crash.
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {}

/** Light tap on every card press. */
export function tapFeedback() {
  Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
}
