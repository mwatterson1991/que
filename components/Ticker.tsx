/**
 * Ticker.tsx — a stock ticker on yourself.
 *
 * Michael's brief: "It should look and feel like an Apple stock ticker
 * for yourself. The initial view is 1D. And the line should be gently
 * moving to make it feel alive and calculating."
 *
 * So: a big current value, a signed change with a colour and a
 * percentage, and a 1D/1W/1M/3M/1Y range row — the Stocks idiom, read
 * straight, drawn on the black ground with the app's one accent. Two
 * things keep it from looking like a child's drawing of four data points:
 *
 *   1. A curve algorithm. Catmull-Rom tangents converted to cubic
 *      Béziers, so the polyline becomes one flowing path. The control
 *      points are clamped inside each segment's own value range, which
 *      means the curve can never bulge past a real reading — it smooths
 *      between the data, it never invents a peak or a dip.
 *   2. Motion. The path is resampled to 120 points and each one carries
 *      a sub-pixel sine offset that drifts on two slow, out-of-phase
 *      loops. The envelope is zero at both ends, so the newest value —
 *      the number in the header, the dot you read — never moves. The
 *      line breathes in the middle, like an instrument still settling.
 */

import { useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { Txt } from "@/components/ui";
import { C, R, SP, T, PRESS_OPACITY } from "@/lib/tokens";
import {
  buildTickerSeries,
  TICKER_RANGES,
  type TickerRange,
} from "@/lib/positivity";
import type { GratitudeRowLike, HabitLogRowLike } from "@/lib/positivity";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

/**
 * How many points the data is resampled to before drawing. Sparse ranges
 * are interpolated *up* to 120 so four readings still draw as a precise
 * instrument; a year of daily readings is allowed up to 200 so the long
 * view isn't decimated. Both are cheap enough to rebuild every frame.
 */
const MIN_SAMPLES = 120;
const MAX_SAMPLES = 200;
/** Peak breathing amplitude, in pixels. Deliberately sub-pixel-ish. */
const DRIFT = 1.7;
/** The endpoint halo's diameter, in pixels. */
const HALO = 22;

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Curve algorithm ─────────────────────────────────────
//
// Catmull-Rom → cubic Bézier. For a uniformly-sampled series the
// tangent at point i is (y[i+1] - y[i-1]) / 2; a segment's two control
// points sit one third of that tangent away from each end. Placing the
// control points' x at exact thirds of the segment makes x(t) linear,
// which is what lets us sample the curve by x below.
//
// Each control point's y is then clamped into the segment's own
// [min, max]. A cubic Bézier lies inside the convex hull of its control
// points, so clamping guarantees the drawn curve stays between the two
// real readings it connects. That is the honesty guarantee: smooth, but
// never overshooting into a value you never had.

function tangents(ys: number[]): number[] {
  "worklet";
  const n = ys.length;
  const m = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    if (i === 0) m[i] = n > 1 ? ys[1] - ys[0] : 0;
    else if (i === n - 1) m[i] = ys[n - 1] - ys[n - 2];
    else m[i] = (ys[i + 1] - ys[i - 1]) / 2;
  }
  return m;
}

function clamp(v: number, a: number, b: number): number {
  "worklet";
  const lo = a < b ? a : b;
  const hi = a < b ? b : a;
  return v < lo ? lo : v > hi ? hi : v;
}

function round2(n: number): number {
  "worklet";
  return Math.round(n * 100) / 100;
}

/** Build one flowing SVG path through the given points. */
function smoothPath(xs: number[], ys: number[]): string {
  "worklet";
  const n = xs.length;
  if (n < 2) return "";
  const m = tangents(ys);
  let d = `M${round2(xs[0])} ${round2(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1] - xs[i];
    const c1x = xs[i] + dx / 3;
    const c2x = xs[i + 1] - dx / 3;
    const c1y = clamp(ys[i] + m[i] / 3, ys[i], ys[i + 1]);
    const c2y = clamp(ys[i + 1] - m[i + 1] / 3, ys[i], ys[i + 1]);
    d += `C${round2(c1x)} ${round2(c1y)} ${round2(c2x)} ${round2(c2y)} ${round2(xs[i + 1])} ${round2(ys[i + 1])}`;
  }
  return d;
}

/**
 * Resample a sparse series up to `count` evenly-spaced points by
 * evaluating the same curve. Because the control points sit at exact
 * thirds, x is linear in t within a segment, so the parameter is just
 * the fractional position between two real readings.
 */
function resample(xs: number[], ys: number[], count: number): { xs: number[]; ys: number[] } {
  const n = xs.length;
  if (n < 2) return { xs, ys };
  const m = tangents(ys);
  const outX = new Array<number>(count);
  const outY = new Array<number>(count);
  const x0 = xs[0];
  const x1 = xs[n - 1];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const x = x0 + ((x1 - x0) * k) / (count - 1);
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const span = xs[seg + 1] - xs[seg];
    const t = span === 0 ? 0 : Math.min(1, Math.max(0, (x - xs[seg]) / span));
    const p0 = ys[seg];
    const p3 = ys[seg + 1];
    const p1 = clamp(p0 + m[seg] / 3, p0, p3);
    const p2 = clamp(p3 - m[seg + 1] / 3, p0, p3);
    const u = 1 - t;
    outX[k] = x;
    outY[k] =
      u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }
  // Pin the ends to the real readings — no rounding drift on the value
  // the user is actually reading.
  outX[0] = xs[0];
  outY[0] = ys[0];
  outX[count - 1] = xs[n - 1];
  outY[count - 1] = ys[n - 1];
  return { xs: outX, ys: outY };
}

// ─── The ticker ──────────────────────────────────────────

export function Ticker({
  gratitude,
  habitLogs,
  lifetimeScore,
  chartRef,
}: {
  gratitude: GratitudeRowLike[];
  habitLogs: HabitLogRowLike[];
  lifetimeScore: number;
  chartRef?: any;
}) {
  const [range, setRange] = useState<TickerRange>("1D");
  const { width } = useWindowDimensions();

  // The ticker sits on the black ground, inset by the layout margin.
  const W = Math.max(200, width - SP.screen * 2);
  const H = 172;
  const padX = 2;
  const padTop = 14;
  const padBottom = 14;

  const series = useMemo(
    () => buildTickerSeries(gratitude, habitLogs, range),
    [gratitude, habitLogs, range],
  );

  const up = series.change > 0;
  const down = series.change < 0;
  const tint = up ? C.switchOn : down ? C.danger : C.labelSecondary;

  const geom = useMemo(() => {
    const vals = series.points.map((p) => p.v);
    const rawLo = Math.min(...vals);
    const rawHi = Math.max(...vals);
    const rawSpan = Math.max(rawHi - rawLo, 4);

    // The baseline. Zero earns it whenever the score is living anywhere
    // near the origin — that's the "above the line you're building, below
    // it you're drifting" reading, and it's where most people are. Once
    // you're far enough above zero that including it would flatten the
    // line, the baseline becomes the window's opening value: the
    // previous-close line every stock chart draws.
    const zeroInView = rawLo - rawSpan * 0.5 <= 0 && rawHi + rawSpan * 0.5 >= 0;
    const baseValue = zeroInView ? 0 : series.open;

    let lo = Math.min(rawLo, baseValue);
    let hi = Math.max(rawHi, baseValue);
    let span = hi - lo;
    if (span < 4) {
      const mid = (hi + lo) / 2;
      lo = mid - 2;
      hi = mid + 2;
      span = 4;
    }
    const pad = span * 0.16;
    lo -= pad;
    hi += pad;

    const px = (x: number) => padX + x * (W - padX * 2);
    const py = (v: number) => padTop + (1 - (v - lo) / (hi - lo)) * (H - padTop - padBottom);

    const rx = series.points.map((p) => px(p.x));
    const ry = series.points.map((p) => py(p.v));
    const samples = Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, rx.length));
    const dense = resample(rx, ry, samples);

    return {
      xs: dense.xs,
      ys: dense.ys,
      baseY: py(baseValue),
      zeroInView,
      lastX: rx[rx.length - 1] ?? 0,
      lastY: ry[ry.length - 1] ?? 0,
      firstX: rx[0] ?? 0,
    };
  }, [series, W]);

  // ── The line is alive ──
  // Two slow, co-prime-ish loops so the drift never visibly repeats.
  const driftA = useSharedValue(0);
  const driftB = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    driftA.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.linear }), -1, false);
    driftB.value = withRepeat(withTiming(1, { duration: 8300, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [driftA, driftB, pulse]);

  const xs = geom.xs;
  const ys = geom.ys;

  const linePath = useDerivedValue(() => {
    const n = ys.length;
    if (n < 2) return "";
    const moved = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      // Envelope: zero at both ends. The newest reading never wobbles.
      const env = Math.sin(Math.PI * u);
      const wave =
        Math.sin(2 * Math.PI * (driftA.value + u * 1.6)) * 0.65 +
        Math.sin(2 * Math.PI * (driftB.value + u * 2.7)) * 0.35;
      moved[i] = ys[i] + DRIFT * env * wave;
    }
    return smoothPath(xs, moved);
  }, [xs, ys]);

  // Plain numbers, not the whole geometry object — the worklet only needs
  // the two x's that close the fill polygon.
  const closeX = geom.lastX;
  const openX = geom.firstX;

  const lineProps = useAnimatedProps(() => ({ d: linePath.value }));
  const fillProps = useAnimatedProps(() => ({
    d: linePath.value ? `${linePath.value}L${closeX} ${H}L${openX} ${H}Z` : "",
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.45, 2.8]) }],
    opacity: interpolate(pulse.value, [0, 0.12, 1], [0, 0.4, 0]),
  }));

  const changeText = `${series.change > 0 ? "+" : ""}${series.change}`;
  const pctText =
    series.changePct === null
      ? null
      : `${series.changePct > 0 ? "+" : ""}${series.changePct.toFixed(1)}%`;

  const onPick = (r: TickerRange) => {
    if (r === range) return;
    setRange(r);
    try { Haptics?.selectionAsync?.(); } catch {}
  };

  return (
    <View
      ref={chartRef}
      collapsable={false}
      style={styles.ticker}
      accessible
      accessibilityLabel={
        `Your positivity, ${series.current} points. ` +
        `${up ? "Up" : down ? "Down" : "Unchanged"} ${Math.abs(series.change)}` +
        `${pctText ? `, ${pctText}` : ""} ${series.periodLabel}.`
      }
    >
      {/* What this is. The founder's complaint was that the number had no
          name — so it gets one, above the number itself. */}
      <Txt kind="footnote" tone="secondary" maxFontSizeMultiplier={1.3}>
        YOUR POSITIVITY
      </Txt>
      <Txt kind="stat" numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {series.current}
      </Txt>

      <View style={styles.changeRow}>
        <Ionicons
          name={up ? "caret-up" : down ? "caret-down" : "remove"}
          size={T.footnote}
          color={tint}
        />
        <Txt kind="subheadline" style={{ color: tint }} maxFontSizeMultiplier={1.3}>
          {changeText}{pctText ? ` (${pctText})` : ""}
        </Txt>
        <Txt kind="footnote" tone="secondary" maxFontSizeMultiplier={1.3}>
          {series.periodLabel}
        </Txt>
      </View>

      <Txt kind="footnote" tone="secondary" style={styles.explain} maxFontSizeMultiplier={1.4}>
        Your positivity, built from gratitude and habits.
      </Txt>

      {/* ── The line ── */}
      <View style={[styles.chart, { width: W, height: H }]}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            {/* The one gradient the app allows: Stocks' fade under the line. */}
            <LinearGradient id="tickFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={C.accent} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={C.accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          <AnimatedPath animatedProps={fillProps} fill="url(#tickFill)" stroke="none" />

          {/* Baseline — zero when you're living near it, otherwise where
              this window opened. Above it you're building, below it you're
              drifting. */}
          <Line
            x1={padX}
            y1={geom.baseY}
            x2={W - padX}
            y2={geom.baseY}
            stroke={C.separator}
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          <AnimatedPath
            animatedProps={lineProps}
            fill="none"
            stroke={C.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* The live endpoint */}
          <Circle cx={geom.lastX} cy={geom.lastY} r="7" fill={C.accent} opacity={0.16} />
          <Circle cx={geom.lastX} cy={geom.lastY} r="3.4" fill={C.accent} />
        </Svg>

        {/* Its halo, breathing outward on a 2.4s loop */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { left: geom.lastX - HALO / 2, top: geom.lastY - HALO / 2 },
            haloStyle,
          ]}
        />
      </View>

      {/* Axis */}
      <View style={[styles.axis, { width: W }]}>
        <Txt kind="caption1" tone="tertiary">{series.startLabel}</Txt>
        <Txt kind="caption1" tone="tertiary">{series.midLabel}</Txt>
        <Txt kind="caption1" tone="tertiary">{series.endLabel}</Txt>
      </View>

      {/* Range selector — 1D first, and 1D is where it opens */}
      <View style={styles.ranges}>
        {TICKER_RANGES.map((r) => {
          const on = r === range;
          return (
            <Pressable
              key={r}
              onPress={() => onPick(r)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.segment,
                on && styles.segmentOn,
                pressed && { opacity: PRESS_OPACITY },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show ${r} range`}
              accessibilityState={{ selected: on }}
            >
              <Txt kind="footnote" tone={on ? "primary" : "secondary"} maxFontSizeMultiplier={1.3}>
                {r}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt kind="caption1" tone="tertiary" maxFontSizeMultiplier={1.3}>
        {geom.zeroInView
          ? "Above the dotted line you're building, below it you're drifting."
          : `Dotted line is where the ${series.periodLabel} opened.`}
        {" "}{lifetimeScore} points all-time.
      </Txt>

      {range === "1D" && series.todayPts === 0 && (
        <Txt kind="caption1" tone="secondary" style={styles.hint} maxFontSizeMultiplier={1.3}>
          Nothing logged yet today — a day with nothing costs 3 points.
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ticker: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.lg,
    paddingBottom: SP.md,
    // Painted, not transparent, so a share capture has the black ground.
    backgroundColor: C.bg,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.xs,
  },
  explain: {
    marginTop: SP.sm,
  },
  chart: {
    marginTop: SP.md,
  },
  halo: {
    position: "absolute",
    width: HALO,
    height: HALO,
    borderRadius: R.pill,
    backgroundColor: C.accent,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SP.xs,
  },
  ranges: {
    flexDirection: "row",
    gap: SP.xs,
    marginTop: SP.md,
    marginBottom: SP.md,
  },
  segment: {
    flex: 1,
    paddingVertical: SP.sm,
    borderRadius: R.pill,
    alignItems: "center",
  },
  segmentOn: {
    backgroundColor: C.fillHigh,
  },
  hint: {
    marginTop: SP.xs,
  },
});

export default Ticker;
