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

/**
 * FrequencyWave — artwork for the Frequencies channel.
 *
 * A photograph tells you nothing about 6 Hz. The honest picture of a
 * frequency is its own waveform, so each card draws the actual shape:
 * delta long and slow, theta in the middle, alpha tight and quick. Put
 * the three side by side and the difference is visible before you read
 * a word, which is the education the founder asked for.
 *
 * The wave drifts sideways on a long loop so the card reads as a live
 * signal rather than a diagram.
 */

export const WAVE_TINTS: Record<string, [string, string]> = {
  delta: ["#3d6bd8", "#7aa8ff"],
  theta: ["#7b4fd8", "#c08bff"],
  alpha: ["#1f9e8f", "#6de6cf"],
};

/** Which wave a session is, or null when it isn't a frequency at all. */
export function waveKindFor(title: string): keyof typeof WAVE_TINTS | null {
  const t = title.toLowerCase();
  if (t.includes("delta")) return "delta";
  if (t.includes("theta")) return "theta";
  if (t.includes("alpha")) return "alpha";
  return null;
}

// Cycles across the visible width — the whole point is that these differ.
const CYCLES: Record<string, number> = { delta: 1.6, theta: 3.4, alpha: 6.2 };

function wavePath(w: number, h: number, cycles: number, envelope: boolean): string {
  const mid = h / 2;
  const amp = h * 0.34;
  const steps = 160;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const phase = (i / steps) * cycles * Math.PI * 2;
    // A slow envelope gives the trace peaks and valleys instead of a
    // mechanical ribbon of identical humps.
    const env = envelope ? 0.62 + 0.38 * Math.sin((i / steps) * Math.PI * 1.6) : 1;
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
  kind: keyof typeof WAVE_TINTS;
  width: number;
  height: number;
}) {
  const drift = useSharedValue(0);
  const [from, to] = WAVE_TINTS[kind];
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

  const id = `wave-${kind}`;

  return (
    <View style={{ width, height, overflow: "hidden", justifyContent: "center" }}>
      {/* Baseline — the zero the signal swings around */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#ffffff"
          strokeOpacity="0.12"
          strokeWidth="1"
        />
      </Svg>
      <Animated.View style={style}>
        {/* Drawn double-width so the drift never exposes an edge */}
        <Svg width={width * 2} height={height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={from} stopOpacity="0.85" />
              <Stop offset="50%" stopColor={to} stopOpacity="1" />
              <Stop offset="100%" stopColor={from} stopOpacity="0.85" />
            </LinearGradient>
          </Defs>
          <Path
            d={wavePath(width * 2, height, cycles * 2, true)}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
