import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Ellipse, Rect, Line, Circle, Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useBackdrop, type BackdropBlob, type BackdropPreset } from "@/lib/backdrop";

// The luminous field every glass surface reacts to. The preset (colour
// story) comes from the user's choice in Settings → Background; `dim`
// is a LOCAL request from a text-heavy screen to quiet the light, and
// multiplies with the global level (wind-down / stage-dark).
//
// Named AuroraBackground for history — it renders whichever backdrop
// is selected, not only the green one.

function Blob({ blob, w, h, opacity }: { blob: BackdropBlob; w: number; h: number; opacity: number }) {
  const t = useSharedValue(0);
  const size = w * blob.sizePct;

  useEffect(() => {
    t.value = withDelay(
      blob.delayMs ?? 0,
      withRepeat(
        withTiming(1, { duration: blob.durationMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true // yoyo — breathe out, breathe in
      )
    );
  }, [t, blob.durationMs, blob.delayMs]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.value * w * blob.driftXPct },
      { translateY: t.value * h * blob.driftYPct },
      { scale: 1 + t.value * (blob.scaleTo - 1) },
    ],
  }));

  const id = `g-${blob.color.replace("#", "")}-${Math.round(size)}`;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: w * blob.xPct - size / 2,
          top: h * blob.yPct - size / 2,
          opacity: (blob.opacity ?? 1) * opacity,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={blob.color} stopOpacity="0.85" />
            <Stop offset="45%" stopColor={blob.color} stopOpacity="0.35" />
            <Stop offset="75%" stopColor={blob.edge} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={blob.edge} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

// Deterministic pseudo-random so the starfield never reshuffles between
// renders (Math.random would twinkle the layout, not the stars).
function hashUnit(n: number, salt: number): number {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}


// Folded silk: long overlapping contours drifting across the field. A
// pure blur has nothing for clear glass to bend — these give it edges to
// catch, which is what reads as "liquid" when a panel passes over.
function Silk({ preset, w, h, opacity }: { preset: BackdropPreset; w: number; h: number; opacity: number }) {
  const cfg = preset.silk;
  const t = useSharedValue(0);

  useEffect(() => {
    if (!cfg) return;
    t.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, cfg]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * w * 0.22 },
      { translateY: (t.value - 0.5) * h * 0.08 },
    ],
  }));

  if (!cfg) return null;

  const amp = h * cfg.amplitude;
  const bands = Array.from({ length: cfg.count }, (_, i) => {
    const y = (i / (cfg.count - 1)) * h * 1.25 - h * 0.12;
    const lift = i % 2 === 0 ? amp : -amp * 0.7;
    // One long S-curve per band, phase-shifted down the screen
    return `M ${-w * 0.3} ${y} C ${w * 0.1} ${y + lift}, ${w * 0.55} ${y - lift}, ${w * 1.3} ${y + lift * 0.35}`;
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={w * 1.6} height={h * 1.3}>
        <Defs>
          <LinearGradient id="silkFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={cfg.color} stopOpacity="0" />
            <Stop offset="35%" stopColor={cfg.color} stopOpacity={cfg.opacity * opacity} />
            <Stop offset="65%" stopColor={cfg.color} stopOpacity={cfg.opacity * opacity} />
            <Stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {bands.map((d, i) => (
          <Path
            key={`glow-${i}`}
            d={d}
            fill="none"
            stroke="url(#silkFade)"
            strokeWidth={i % 3 === 0 ? 16 : 9}
            strokeOpacity={0.5}
            strokeLinecap="round"
          />
        ))}
        {bands.map((d, i) => (
          <Path
            key={`core-${i}`}
            d={d}
            fill="none"
            stroke="url(#silkFade)"
            strokeWidth={i % 3 === 0 ? 2.6 : 1.5}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Rays({ preset, w, h, opacity }: { preset: BackdropPreset; w: number; h: number; opacity: number }) {
  const r = preset.rays;
  if (!r) return null;
  const ox = w * r.originXPct;
  const oy = h * r.originYPct;
  const reach = Math.hypot(w, h) * 1.6;
  const spread = Math.PI * 0.75;
  const start = Math.PI * 0.55;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: r.count }, (_, i) => {
        const a = start + (i / (r.count - 1)) * spread;
        // Alternating weight keeps the fan from moiréing into a solid block
        const width = i % 3 === 0 ? 1.6 : 0.8;
        return (
          <Line
            key={i}
            x1={ox}
            y1={oy}
            x2={ox + Math.cos(a) * reach}
            y2={oy + Math.sin(a) * reach}
            stroke={r.color}
            strokeWidth={width}
            strokeOpacity={r.opacity * opacity}
          />
        );
      })}
    </Svg>
  );
}

function Sparkle({ preset, w, h, opacity }: { preset: BackdropPreset; w: number; h: number; opacity: number }) {
  const s = preset.sparkle;
  if (!s) return null;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: s.count }, (_, i) => (
        <Circle
          key={i}
          cx={hashUnit(i, 1) * w}
          cy={hashUnit(i, 2) * h}
          r={0.6 + hashUnit(i, 3) * 1.3}
          fill="#ffffff"
          fillOpacity={s.opacity * opacity * (0.4 + hashUnit(i, 4) * 0.6)}
        />
      ))}
    </Svg>
  );
}

export default function AuroraBackground({ dim = 1 }: { dim?: number }) {
  const { width: w, height: h } = useWindowDimensions();
  const { preset, level } = useBackdrop();
  const opacity = dim * level;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: preset.base, overflow: "hidden" }]}
      pointerEvents="none"
    >
      {opacity > 0.01 && (
        <>
          {preset.blobs.map((blob, i) => (
            <Blob key={`${preset.id}-${i}`} blob={blob} w={w} h={h} opacity={opacity} />
          ))}
          <Silk preset={preset} w={w} h={h} opacity={opacity} />
          <Rays preset={preset} w={w} h={h} opacity={opacity} />
          <Sparkle preset={preset} w={w} h={h} opacity={opacity} />
        </>
      )}
      {/* Vignette keeps headers and screen edges legible over any preset */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vig" cx="50%" cy="50%" r="75%">
            <Stop offset="0%" stopColor={preset.base} stopOpacity="0" />
            <Stop offset="80%" stopColor={preset.base} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={preset.base} stopOpacity="0.6" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#vig)" />
      </Svg>
    </View>
  );
}
