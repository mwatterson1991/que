// feel.ts — the one place every tap gets its feedback.
//
// The app should feel like something under your fingers: a tap is a light
// touch, a change of state is a click, finishing something is a warm
// success. Every screen calls these instead of reaching for expo-haptics
// itself so the whole app agrees on what a tap feels like.

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

const fire = (fn: () => Promise<void> | undefined) => {
  try { fn()?.catch?.(() => {}); } catch {}
};

export const feel = {
  /** A light touch: any button, row, or card. */
  tap: () => fire(() => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light)),
  /** A firmer press: a primary action. */
  press: () => fire(() => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium)),
  /** The barely-there tick of a picker, wheel, or segment change. */
  tick: () => fire(() => Haptics?.selectionAsync?.()),
  /** A switch or check changing state: soft on the way on, softer off. */
  toggle: (on: boolean) =>
    fire(() =>
      Haptics?.impactAsync?.(on ? Haptics.ImpactFeedbackStyle?.Rigid : Haptics.ImpactFeedbackStyle?.Soft)
    ),
  /** Something was saved, finished, or achieved. */
  success: () => fire(() => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success)),
  /** Careful: something is about to be removed. */
  warn: () => fire(() => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Warning)),
  /** Something went wrong. */
  error: () => fire(() => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Error)),
  /** A little flourish: three soft taps rising, for a completed day. */
  celebrate: () => {
    fire(() => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Soft));
    setTimeout(() => fire(() => Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light)), 90);
    setTimeout(() => fire(() => Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success)), 200);
  },
};

// Press-scale spring shared by every pressable, so they all move alike.
export const PRESS_SCALE = 0.97;
export const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;
