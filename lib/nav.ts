import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { C, TYPE } from "@/lib/tokens";

/**
 * nav.ts — one header configuration for the whole app.
 *
 * Native stack headers everywhere, styled like Apple's: black bar, no
 * hairline, orange tint on the back chevron and bar buttons, system
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
