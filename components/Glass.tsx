import { View, StyleSheet, type ViewProps } from "react-native";
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
 * white text can land on a bright blob and disappear. Every glass
 * surface that carries text therefore gets a veil: a low-opacity dark
 * layer *inside* the glass, under the content. It costs almost nothing
 * visually (the refraction and the specular edge still read as glass)
 * and it guarantees the text keeps its contrast as the light moves.
 *
 * `scrim` levels: "none" for decoration-only surfaces, "soft" for large
 * type, "strong" for dense or small type over an active backdrop.
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

export function Glass({
  style,
  children,
  interactive = false,
  scrim = "soft",
  ...rest
}: ViewProps & { interactive?: boolean; scrim?: ScrimLevel }) {
  const veil =
    SCRIM_OPACITY[scrim] > 0 ? (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(6,10,8,${SCRIM_OPACITY[scrim]})` }]}
      />
    ) : null;

  if (hasGlass) {
    return (
      <GlassView glassEffectStyle="clear" isInteractive={interactive} style={style} {...rest}>
        {veil}
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.fallback, style]} {...rest}>
      {veil}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(18,18,20,0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
});
