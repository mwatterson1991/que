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
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

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

const SCRIM_OPACITY: Record<ScrimLevel, number> = {
  none: 0,
  soft: 0.22,
  strong: 0.4,
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
function Sheen({
  radius,
  phase,
  intensity,
}: {
  radius: number;
  phase: number;
  intensity: number;
}) {
  const t = useSharedValue(0);
  // Measured, not assumed: a fixed sweep distance makes a 56pt button
  // glint for half a second while a full-width dock washes properly.
  // Scaling travel to the surface gives every size the same gesture.
  const w = useSharedValue(260);

  useEffect(() => {
    t.value = withDelay(
      Math.round(phase * 5200),
      withRepeat(withTiming(1, { duration: 7400, easing: Easing.inOut(Easing.cubic) }), -1, false),
    );
  }, [t, phase]);

  const style = useAnimatedStyle(() => ({
    // Travels well past both edges so the band enters and leaves rather
    // than appearing in place
    transform: [{ translateX: interpolate(t.value, [0, 1], [-1.3, 1.3]) * w.value }],
    opacity: interpolate(t.value, [0, 0.14, 0.5, 0.86, 1], [0, 1, 1, 1, 0]),
  }));

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => { w.value = Math.max(48, e.nativeEvent.layout.width); }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <Stop offset="38%" stopColor="#ffffff" stopOpacity={0.02 * intensity} />
              <Stop offset="48%" stopColor="#dff4ff" stopOpacity={0.16 * intensity} />
              <Stop offset="52%" stopColor="#ffe9f7" stopOpacity={0.14 * intensity} />
              <Stop offset="62%" stopColor="#ffffff" stopOpacity={0.02 * intensity} />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function PrismRim({ radius, intensity }: { radius: number; intensity: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#9fe8ff" stopOpacity={0.5 * intensity} />
            <Stop offset="26%" stopColor="#ffffff" stopOpacity={0.62 * intensity} />
            <Stop offset="52%" stopColor="#ffd9f2" stopOpacity={0.3 * intensity} />
            <Stop offset="74%" stopColor="#fff3c4" stopOpacity={0.34 * intensity} />
            <Stop offset="100%" stopColor="#bfe4ff" stopOpacity={0.5 * intensity} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0.75"
          y="0.75"
          width="99%"
          height="99%"
          rx={radius}
          ry={radius}
          fill="none"
          stroke="url(#rim)"
          strokeWidth="1.5"
        />
      </Svg>
    </View>
  );
}

export function Glass({
  style,
  children,
  interactive = false,
  scrim = "soft",
  liquid = false,
  phase = 0,
  intensity = 1,
  ...rest
}: ViewProps & {
  interactive?: boolean;
  scrim?: ScrimLevel;
  /** Adds the moving sheen and prismatic rim. */
  liquid?: boolean;
  /** 0–1 offset so neighbouring surfaces don't shimmer in lockstep. */
  phase?: number;
  /** Scales the whole liquid effect for quiet surfaces. */
  intensity?: number;
}) {
  const radius = readRadius(style);

  const veil =
    SCRIM_OPACITY[scrim] > 0 ? (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(6,8,10,${SCRIM_OPACITY[scrim]})` }]}
      />
    ) : null;

  const shimmer = liquid ? (
    <>
      <Sheen radius={radius} phase={phase} intensity={intensity} />
      <PrismRim radius={radius} intensity={intensity} />
    </>
  ) : null;

  if (hasGlass) {
    return (
      <GlassView glassEffectStyle="clear" isInteractive={interactive} style={style} {...rest}>
        {veil}
        {shimmer}
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.fallback, style]} {...rest}>
      {veil}
      {shimmer}
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
  phase = 0,
  ...rest
}: ViewProps & { tone?: "bright" | "quiet"; phase?: number }) {
  return (
    <Glass
      interactive
      liquid
      phase={phase}
      intensity={tone === "bright" ? 1.35 : 0.8}
      scrim={tone === "bright" ? "none" : "soft"}
      style={[tone === "bright" ? styles.btnBright : styles.btnQuiet, style]}
      {...rest}
    >
      {children}
    </Glass>
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
