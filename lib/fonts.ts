// Central font family map — use these in all StyleSheet.create() calls.
// Only weights that are actually used get loaded (see app/_layout.tsx).
//   300 Light (big numerals only), 400 Regular, 500 Medium,
//   600 Semibold, 700 Bold

export const F = {
  light: "Switzer-Light",
  regular: "Switzer-Regular",
  medium: "Switzer-Medium",
  semibold: "Switzer-Semibold",
  bold: "Switzer-Bold",
} as const;

// The 9-step type scale. Every fontSize in the app comes from here —
// no magic numbers. Consolidated 2026-08-26 from 22 ad-hoc sizes.
export const S = {
  micro: 12, // kickers, counters, tiny labels
  caption: 13, // metadata, captions, sublabels
  secondary: 15, // secondary body, card titles
  body: 17, // primary body, rows (iOS native body size)
  title: 22, // screen titles, rail headers, wheel digits
  heading: 28, // hero titles, stat numbers
  display: 34, // big time readouts, page-title serifs
  hero: 44, // welcome headline
  clock: 56, // alarm clock digits
} as const;
