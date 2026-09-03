import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Line } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { C } from "@/lib/tokens";

/**
 * FrequencyWave — artwork for the Frequencies channel.
 *
 * A photograph tells you nothing about 6 Hz. The honest picture of a
 * frequency is its own waveform, so each card draws the actual shape:
 * delta long and slow, theta in the middle, alpha tight and quick. Put
 * the three side by side and the difference is visible before you read
 * a word.
 *
 * The trace is the accent colour over a quiet baseline, with a single
 * vertical fill under the line — the way Stocks draws a chart. The wave
 * drifts sideways on a long loop so the card reads as a live signal
 * rather than a diagram.
 */

// Cycles across the visible width — the whole point is that these differ.
const CYCLES = { delta: 1.6, theta: 3.4, alpha: 6.2 } as const;

export type WaveKind = keyof typeof CYCLES;

/** Which wave a session is, or null when it isn't a frequency at all. */
export function waveKindFor(title: string): WaveKind | null {
  const t = title.toLowerCase();
  if (t.includes("delta")) return "delta";
  if (t.includes("theta")) return "theta";
  if (t.includes("alpha")) return "alpha";
  return null;
}

function wavePath(w: number, h: number, cycles: number): string {
  const mid = h / 2;
  const amp = h * 0.34;
  const steps = 160;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const phase = (i / steps) * cycles * Math.PI * 2;
    // A slow envelope gives the trace peaks and valleys instead of a
    // mechanical ribbon of identical humps.
    const env = 0.62 + 0.38 * Math.sin((i / steps) * Math.PI * 1.6);
    const y = mid - Math.sin(phase) * amp * env;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
}

export default function FrequencyWave({
  kind,
  width,
  height,
}: {
  kind: WaveKind;
  width: number;
  height: number;
}) {
  const drift = useSharedValue(0);
  const cycles = CYCLES[kind];

  useEffect(() => {
    // One full period of travel, so the loop point is invisible
    drift.value = withRepeat(
      withTiming(1, { duration: 9000 + cycles * 600, easing: Easing.linear }),
      -1,
      false,
    );
  }, [drift, cycles]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -drift.value * (width / cycles) }],
  }));

  const id = `wave-fill-${kind}`;
  const w2 = width * 2;
  const line = wavePath(w2, height, cycles * 2);

  return (
    <View style={{ width, height, overflow: "hidden", justifyContent: "center" }}>
      {/* Baseline — the zero the signal swings around */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={C.fillHighest}
          strokeWidth="1"
        />
      </Svg>
      <Animated.View style={style}>
        {/* Drawn double-width so the drift never exposes an edge */}
        <Svg width={w2} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={C.accent} stopOpacity="0.28" />
              <Stop offset="100%" stopColor={C.accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={`${line}L${w2},${height}L0,${height}Z`} fill={`url(#${id})`} />
          <Path
            d={line}
            fill="none"
            stroke={C.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
