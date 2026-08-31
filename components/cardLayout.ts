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
// bottom: a rail costs its label (~38) plus the card, and the browser
// spends roughly 210 on the header + search bar before the first one.
// 0.62 leaves ~110pt of the following rail visible on a 6.1" phone —
// enough to say "keep scrolling", now that the rail label above the
// card is a quiet one-liner rather than a heading.
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
// not a poster you admire, so it is short: a square of artwork with the
// title beside it. Tall enough for a two-line title at 22.
export const WIDE_W = SCREEN_W - RAIL_EDGE * 2;
export const WIDE_H = Math.round(WIDE_W * 0.42);

/**
 * Shimmer offset for the nth card in a rail. Neighbours must never
 * catch the light in unison — that reads as the screen flickering
 * rather than as light crossing glass. Wrapped to 0–1 because `Glass`
 * turns the phase into a start delay, and a rail is longer than 6 cards.
 */
export function phaseFor(index = 0): number {
  return (index * 0.17) % 1;
}

// ─── Channel colour ────────────────────────────────────────

/**
 * There is no photograph behind the app any more — the animated
 * gradient is the only background, and it belongs to the user (they
 * pick the preset in Settings; we never touch it).
 *
 * So the feeling that the mood shifts as you move through the library
 * has to come from the CARDS instead. Every channel owns a hue, and
 * each card wears it three ways: a wash inside the glass, a hairline on
 * its edges, and a coloured lift at the top of the scrim behind its
 * text. Scroll a rail and the colour under your thumb changes; scroll
 * down the shelves and the whole screen's accent moves with you.
 *
 * All three are translucent by design. Nothing here is allowed to go
 * opaque — the gradient has to keep reading straight through the glass.
 */

const CHANNEL_HUE: Record<string, string> = {
  Naturescapes: "#4fd6a0", // dawn green
  Frequencies: "#8f7cff",  // the violet of the theta wave
  Horoscope: "#6fd0ff",    // cold sky
  "Positive Words": "#ffc98a", // warm paper
  Hypnotherapy: "#d989e8", // dusk mauve
};

// Anything the catalog grows later still gets a colour, picked stably
// from the same family so a new channel can never clash.
const HUE_POOL = ["#4fd6a0", "#8f7cff", "#6fd0ff", "#ffc98a", "#d989e8", "#ff9d8a"];

function hueFor(channel: string): string {
  const named = CHANNEL_HUE[channel];
  if (named) return named;
  let h = 0;
  for (let i = 0; i < channel.length; i++) h = (h * 31 + channel.charCodeAt(i)) >>> 0;
  return HUE_POOL[h % HUE_POOL.length];
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface CardTone {
  /** Whole-panel wash — the colour you feel rather than see. */
  wash: string;
  /** Hairline around the panel and around the artwork. */
  edge: string;
  /** The hue at full strength, for the top of a text scrim. */
  accent: string;
  /** Placeholder behind artwork that hasn't decoded yet. */
  well: string;
}

/**
 * `light` is the house-lights level from `useBackdrop()` — wind-down and
 * stage-dark pull the gradient down, and the cards' colour has to go
 * with it or they start shouting over a screen that is trying to sleep.
 * The edge never fades all the way out: structure is not decoration.
 */
export function toneFor(channel: string, light = 1): CardTone {
  const [r, g, b] = toRgb(hueFor(channel));
  const k = Math.max(0, Math.min(1, light));
  return {
    wash: `rgba(${r},${g},${b},${(0.14 * k).toFixed(3)})`,
    edge: `rgba(${r},${g},${b},${(0.1 + 0.26 * k).toFixed(3)})`,
    accent: `rgb(${r},${g},${b})`,
    well: `rgba(${Math.round(r * 0.2)},${Math.round(g * 0.2)},${Math.round(b * 0.2)},0.9)`,
  };
}

/**
 * The house-lights level changes every five seconds while wind-down
 * runs. Quantising it means a rail full of cards re-renders three or
 * four times over the whole fade instead of thirty.
 */
export function quantizeLight(level: number): number {
  return Math.round(level * 4) / 4;
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
