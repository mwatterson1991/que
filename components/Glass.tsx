import { useEffect } from "react";
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { GlassView, GlassContainer, isLiquidGlassAvailable } from "expo-glass-effect";

// One glass surface for the whole app. iOS 26+ renders Apple's Liquid Glass
// in the "clear" style (liquid transparent, not frosted — Michael's call);
// everything older gets a designed translucent fallback so the layout still
// reads as panels over the backdrop.
export const hasGlass = isLiquidGlassAvailable();

/**
 * Legibility contract.
 *
 * Clear glass takes its luminance from whatever drifts behind it, so
 * white text can land on a bright orb and disappear. Every glass
 * surface that carries text therefore gets a veil: a low-opacity dark
 * layer *inside* the glass, under the content.
 */
export type ScrimLevel = "none" | "soft" | "strong";

const SCRIM_TINT: Record<ScrimLevel, string | undefined> = {
  none: undefined,
  soft: "rgba(6,8,12,0.20)",
  strong: "rgba(6,8,12,0.34)",
};

/** Text sitting directly on artwork (not on glass) needs its own lift. */
export const TEXT_ON_IMAGE = {
  textShadowColor: "rgba(0,0,0,0.75)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

/**
 * The liquid part.
 *
 * Real glass is never static: light travels across it and its edges
 * split that light into colour. Two cheap layers do most of the work —
 * a specular band that sweeps the surface on a long loop, and a
 * prismatic rim that catches the sweep as it passes. Both live INSIDE
 * the glass, above the veil and below the content, so text stays on top
 * and readable.
 *
 * `liquid` takes a phase offset (0–1) so a stack of cards doesn't
 * shimmer in unison, which reads as a screen flicker rather than light.
 */
export function Glass({
  style,
  children,
  interactive = true,
  scrim = "none",
  variant = "clear",
  tint,
  // Accepted and ignored — the material generates its own specular
  // response now. Kept so existing call sites keep compiling.
  liquid: _liquid,
  phase: _phase,
  intensity: _intensity,
  ...rest
}: ViewProps & {
  interactive?: boolean;
  scrim?: ScrimLevel;
  /** `clear` needs vivid content behind it; `regular` adapts anywhere. */
  variant?: "clear" | "regular";
  /** Marks a primary action or state — used sparingly, per Apple. */
  tint?: string;
  liquid?: boolean;
  phase?: number;
  intensity?: number;
}) {
  if (hasGlass) {
    return (
      <GlassView
        glassEffectStyle={variant}
        isInteractive={interactive}
        tintColor={tint ?? SCRIM_TINT[scrim]}
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.fallback, style]} {...rest}>
      {children}
    </View>
  );
}

/**
 * A glass control — the app has no solid white buttons. Pass `tone="bright"`
 * for a primary action, which lifts the veil and strengthens the rim so it
 * still reads as the confident choice on the screen.
 */
export function GlassButton({
  style,
  children,
  tone = "bright",
  phase: _phase,
  ...rest
}: ViewProps & { tone?: "bright" | "quiet"; phase?: number }) {
  return (
    <Glass
      interactive
      tint={tone === "bright" ? "rgba(255,255,255,0.26)" : undefined}
      style={[tone === "bright" ? styles.btnBright : styles.btnQuiet, style]}
      {...rest}
    >
      {children}
    </Glass>
  );
}

/**
 * Controls that merge into one another as they approach — the gooey
 * behaviour Apple's material does natively. Children must be sibling
 * Glass surfaces; `spacing` is the distance at which they begin to blend
 * into one connected shape.
 */
export function GlassCluster({
  spacing = 20,
  style,
  children,
  ...rest
}: ViewProps & { spacing?: number }) {
  if (!hasGlass) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <GlassContainer spacing={spacing} style={style} {...rest}>
      {children}
    </GlassContainer>
  );
}

/** Pull a corner radius out of whatever style shape was passed. */
function readRadius(style: StyleProp<ViewStyle>): number {
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const r = flat?.borderRadius;
  return typeof r === "number" ? r : 18;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(18,18,20,0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  btnBright: {
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  btnQuiet: {
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
