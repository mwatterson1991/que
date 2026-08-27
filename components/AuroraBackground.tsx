import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Ellipse, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

// The luxe field the glass reacts to: deep near-black green with three
// slow-breathing glow blobs. No photography — glass over pure light.
// Each blob is an SVG radial gradient (soft falloff, no filters needed),
// drifting and swelling on its own long loop so the field never repeats
// visibly. Michael's brief: "glowy green sort of morphing screen".

const BASE = "#020805";

function Blob({
  size,
  color,
  edge,
  x,
  y,
  driftX,
  driftY,
  scaleTo,
  duration,
  delay = 0,
  opacity = 1,
}: {
  size: number;
  color: string;
  edge: string;
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  scaleTo: number;
  duration: number;
  delay?: number;
  opacity?: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true // yoyo — breathe out, breathe in
      )
    );
  }, [t, duration, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.value * driftX },
      { translateY: t.value * driftY },
      { scale: 1 + t.value * (scaleTo - 1) },
    ],
  }));

  const id = `g-${color.replace("#", "")}-${size}`;

  return (
    <Animated.View
      style={[
        { position: "absolute", left: x - size / 2, top: y - size / 2, opacity },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <Stop offset="45%" stopColor={color} stopOpacity="0.35" />
            <Stop offset="75%" stopColor={edge} stopOpacity="0.10" />
            <Stop offset="100%" stopColor={edge} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export default function AuroraBackground({ dim = 1 }: { dim?: number }) {
  // dim < 1 quiets the glow for text-heavy screens (journal, tracker)
  const { width: w, height: h } = useWindowDimensions();

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: BASE, overflow: "hidden" }]} pointerEvents="none">
      {/* Heart of the glow — emerald, upper third */}
      <Blob
        size={w * 1.6}
        color="#2fbf71"
        edge="#0a3d24"
        x={w * 0.3}
        y={h * 0.28}
        driftX={w * 0.18}
        driftY={h * 0.08}
        scaleTo={1.25}
        duration={9000}
        opacity={dim}
      />
      {/* Deep teal counterweight — lower right, slower */}
      <Blob
        size={w * 1.9}
        color="#0e6e54"
        edge="#04231a"
        x={w * 0.85}
        y={h * 0.75}
        driftX={-w * 0.14}
        driftY={-h * 0.1}
        scaleTo={1.3}
        duration={13000}
        delay={1200}
        opacity={dim}
      />
      {/* Bright lime accent — small, wandering, gives the "alive" flicker */}
      <Blob
        size={w * 0.9}
        color="#9fe870"
        edge="#2fbf71"
        x={w * 0.7}
        y={h * 0.15}
        driftX={-w * 0.25}
        driftY={h * 0.22}
        scaleTo={1.45}
        duration={11000}
        delay={600}
        opacity={0.55 * dim}
      />
      {/* Soft top-and-bottom vignette so headers and edges stay legible */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vig" cx="50%" cy="50%" r="75%">
            <Stop offset="0%" stopColor={BASE} stopOpacity="0" />
            <Stop offset="80%" stopColor={BASE} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={BASE} stopOpacity="0.6" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#vig)" />
      </Svg>
    </View>
  );
}
