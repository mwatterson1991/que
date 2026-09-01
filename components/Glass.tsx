import { View, StyleSheet, type ViewProps, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { GlassView, GlassContainer, isLiquidGlassAvailable } from "expo-glass-effect";
import { useMaterial, MATTE } from "@/lib/material";

/**
 * Glass.tsx — every surface in the app, in whichever material is chosen.
 *
 * The component kept its name because every screen already draws through
 * it; what it renders now depends on the material mode.
 *
 * MATTE (default): an opaque, near-black panel lit from above — a pale
 * top edge, a gentle vertical falloff, a soft shadow beneath. It owes
 * nothing to what sits behind it, so it looks the same on a bright
 * gradient or a black screen, and type on it is always legible.
 *
 * GLASS: Apple's material. It lenses rather than blurs, so it only reads
 * as glass over vivid, structured content, and it must have nothing
 * painted inside it or the lensing is covered and it goes flat.
 */

export const hasGlass = isLiquidGlassAvailable();

export type ScrimLevel = "none" | "soft" | "strong";

/** Glass dims via the material's own tint; a child overlay would kill it. */
const SCRIM_TINT: Record<ScrimLevel, string | undefined> = {
  none: undefined,
  soft: "rgba(6,8,12,0.20)",
  strong: "rgba(6,8,12,0.34)",
};

/** Text sitting directly on artwork (not on a surface) needs its own lift. */
export const TEXT_ON_IMAGE = {
  textShadowColor: "rgba(0,0,0,0.75)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;

/** The light-from-above gradient that gives a matte panel its body. */
function MatteBody({ radius, raised }: { radius: number; raised: boolean }) {
  const id = raised ? "matteRaised" : "matteFlat";
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={raised ? 0.07 : 0.05} />
            <Stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.012" />
            <Stop offset="100%" stopColor="#000000" stopOpacity={raised ? 0.22 : 0.16} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function Surface({
  style,
  children,
  interactive = true,
  scrim = "none",
  variant = "clear",
  tint,
  raised = false,
  // Accepted and ignored — leftovers from the hand-painted era.
  liquid: _liquid,
  phase: _phase,
  intensity: _intensity,
  ...rest
}: ViewProps & {
  interactive?: boolean;
  scrim?: ScrimLevel;
  variant?: "clear" | "regular";
  tint?: string;
  /** A primary surface — a touch brighter, with a deeper shadow. */
  raised?: boolean;
  liquid?: boolean;
  phase?: number;
  intensity?: number;
}) {
  const { mode } = useMaterial();
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const radius = typeof flat.borderRadius === "number" ? flat.borderRadius : 18;

  if (mode === "matte") {
    return (
      <View
        style={[
          {
            backgroundColor: raised ? MATTE.surfaceRaised : MATTE.surface,
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: MATTE.hairline,
            shadowColor: MATTE.shadow,
            shadowOpacity: raised ? 0.5 : 0.38,
            shadowRadius: raised ? 20 : 14,
            shadowOffset: { width: 0, height: raised ? 10 : 6 },
          },
          style,
        ]}
        {...rest}
      >
        <MatteBody radius={radius} raised={raised} />
        {children}
      </View>
    );
  }

  if (!hasGlass) {
    return (
      <View style={[styles.fallback, style]} {...rest}>
        {children}
      </View>
    );
  }

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

/** Historical name — every existing screen imports this. */
export const Glass = Surface;

/**
 * Controls that merge into one another as they approach. Only glass can
 * do this; in matte the children simply sit side by side.
 */
export function GlassCluster({
  spacing = 20,
  style,
  children,
  ...rest
}: ViewProps & { spacing?: number }) {
  const { mode } = useMaterial();
  if (mode === "matte" || !hasGlass) {
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

/** The app's button — one shape, whichever material is on. */
export function GlassButton({
  style,
  children,
  tone = "bright",
  phase: _phase,
  ...rest
}: ViewProps & { tone?: "bright" | "quiet"; phase?: number }) {
  return (
    <Surface
      interactive
      raised={tone === "bright"}
      tint={tone === "bright" ? "rgba(255,255,255,0.26)" : undefined}
      style={[tone === "bright" ? styles.btnBright : styles.btnQuiet, style]}
      {...rest}
    >
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(18,18,20,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  btnBright: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnQuiet: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
