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

/** Portrait, properly tall — a poster, not a tile. */
const CARD_ASPECT = 1.58;

// Capped against screen height so the NEXT rail still peeks in from the
// bottom: a rail costs its label plus the card, and the browser spends
// roughly 210 on the header + search bar before the first one.
export const CARD_H = Math.min(
  Math.round(CARD_W * CARD_ASPECT),
  Math.round(SCREEN_H * 0.62),
);

/** One swipe = one card. FlatList snaps on multiples of this. */
export const SNAP_INTERVAL = CARD_W + RAIL_GAP;

// Trailing padding so the LAST card can still scroll flush to the left
// gutter — without it the final snap point is unreachable and the rail
// bounces back. Derived, not guessed: content must be at least a
// screen-width longer than the last card's snap offset.
export const RAIL_TAIL = Math.max(RAIL_EDGE, SCREEN_W - RAIL_EDGE - CARD_W);

// Search results are one full-width column. A result is a row you scan,
// not a poster you admire, so it is short.
export const WIDE_W = SCREEN_W - RAIL_EDGE * 2;
export const WIDE_H = Math.round(WIDE_W * 0.42);

// Optional at runtime — a dev client without the module must not crash.
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {}

/** Light tap on every card press. */
export function tapFeedback() {
  Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
}
