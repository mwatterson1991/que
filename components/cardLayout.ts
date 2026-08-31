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
const CARD_ASPECT = 1.5;

// Capped against screen height so the NEXT rail still peeks in from the
// bottom: a rail costs its title (~46) plus the card, and the browser
// spends roughly 220 on the header + search bar before the first one.
// 0.58 leaves ~145pt of the following rail visible on a 6.1" phone.
export const CARD_H = Math.min(
  Math.round(CARD_W * CARD_ASPECT),
  Math.round(SCREEN_H * 0.58),
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

/**
 * Shimmer offset for the nth card in a rail. Neighbours must never
 * catch the light in unison — that reads as the screen flickering
 * rather than as light crossing glass. Wrapped to 0–1 because `Glass`
 * turns the phase into a start delay, and a rail is longer than 6 cards.
 */
export function phaseFor(index = 0): number {
  return (index * 0.17) % 1;
}

// Optional at runtime — a dev client without the module must not crash.
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {}

/** Light tap on every card press. */
export function tapFeedback() {
  Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
}
