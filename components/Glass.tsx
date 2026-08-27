import { View, StyleSheet, type ViewProps } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

// One glass surface for the whole app. iOS 26+ renders Apple's Liquid Glass
// in the "clear" style (liquid transparent, not frosted — Michael's call);
// everything older gets a designed translucent fallback so the layout still
// reads as panels over the backdrop.
export const hasGlass = isLiquidGlassAvailable();

export function Glass({
  style,
  children,
  interactive = false,
  ...rest
}: ViewProps & { interactive?: boolean }) {
  if (hasGlass) {
    return (
      <GlassView
        glassEffectStyle="clear"
        isInteractive={interactive}
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

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(18,18,20,0.62)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
});
