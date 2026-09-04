import type { ComponentProps } from "react";
import type { Stack } from "expo-router";
import { C, SP, TYPE } from "@/lib/tokens";

// ─── The floating tab bar ────────────────────────────────────────────────────
//
// The tab bar (app/(tabs)/_layout.tsx) is a floating liquid-glass pill, not
// a docked UITabBar, so it floats OVER the scene instead of shrinking it.
// Scroll views on tab roots must reserve room for it themselves:
//
//   <ScrollView
//     contentInsetAdjustmentBehavior="automatic"      // adds the home indicator
//     contentContainerStyle={{ paddingBottom: TAB_BAR_INSET }}  // adds the pill
//   />
//
// `automatic` already covers the safe-area bottom, so TAB_BAR_INSET is only
// the part above it: the pill, the gap beneath it, and one layout margin of
// breathing room above it.

/** Height of the glass pill. */
export const TAB_BAR_HEIGHT = 64;
/** Gap between the pill and the home indicator (or the screen edge). */
export const TAB_BAR_GAP = 24;
/** Extra bottom padding a tab-root scroll view needs so its last item clears the pill. */
export const TAB_BAR_INSET = TAB_BAR_HEIGHT + TAB_BAR_GAP + SP.lg;

// The native-stack options type, reached through expo-router so this file
// does not depend on a package that is only a transitive dependency.
type NativeStackNavigationOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack>["screenOptions"]>,
  (...args: any[]) => any
>;

/**
 * nav.ts — one header configuration for the whole app.
 *
 * Native stack headers everywhere, styled like Apple's: black bar, no
 * hairline, white tint on the back chevron and bar buttons, system
 * font title. Root tab screens add a large title (Clock, Settings and
 * Music all do), pushed screens use the standard inline title.
 */

export const STACK: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: C.bg },
  headerShadowVisible: false,
  headerTintColor: C.accent,
  headerTitleStyle: { color: C.label, fontSize: TYPE.headline.fontSize, fontWeight: TYPE.headline.fontWeight },
  headerLargeTitleStyle: { color: C.label, fontWeight: TYPE.largeTitle.fontWeight },
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: C.bg },
  animation: "default",
};

/** The first screen of a tab: large title that collapses on scroll. */
export const ROOT: NativeStackNavigationOptions = {
  ...STACK,
  headerLargeTitle: true,
  headerLargeTitleShadowVisible: false,
  headerTransparent: false,
};

/** A full-screen surface with no bar (welcome, player, wind-down, paywall). */
export const BARE: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: C.bg },
};

/** iOS sheet presentation for a modal editor. */
export const SHEET: NativeStackNavigationOptions = {
  ...STACK,
  presentation: "modal",
  headerLargeTitle: false,
};
