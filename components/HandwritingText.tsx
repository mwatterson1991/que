/**
 * HandwritingText — text that is WRITTEN rather than printed.
 *
 * The trick has three parts:
 *
 *  1. Single-stroke letterforms (see lib/hersheyFont.ts). A normal font glyph
 *     is a filled outline, so animating its stroke traces the letter's edge —
 *     it looks like a balloon inflating. Hershey Script gives us the skeleton
 *     path a pen actually travels, in the order a hand travels it.
 *
 *  2. Draw-on via strokeDasharray/strokeDashoffset. Each pen-down stroke gets a
 *     dash exactly as long as itself; sliding the offset from length → 0 walks
 *     the ink along the path. Stroke lengths are summed from the polyline in
 *     lib/hersheyFont.ts, so no getTotalLength() call is needed. Crucially each
 *     stroke is its OWN <Path>: SVG restarts a dash pattern at every subpath,
 *     so a two-stroke letter in one path would draw both halves at once.
 *
 *  3. A shared "pen" clock. A letter does not start when it is typed, it starts
 *     when the pen is free. Type fast and the letters queue and trail your
 *     fingers, then the hand hurries to catch up — which is the thing that
 *     actually sells it as writing rather than as an effect.
 *
 * Once a letter has finished it stops being animated and is merged into a
 * single static <Path> with every other finished letter, so a long line costs
 * one node, not one per stroke.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  layoutHandwriting,
  mergePaths,
  type HandwritingGlyph,
  type HandwritingLayout,
  type HandwritingStroke,
} from "@/lib/hersheyFont";
import { C } from "@/lib/tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── The pen ─────────────────────────────────────────────
/** Shared between every glyph in one field: the ms timestamp the hand is next
 *  free. Held in a ref by the field so it survives re-renders. */
export type Pen = { freeAt: number };

const MIN_MS = 90; // a dot still takes a moment
const MAX_MS = 260; // a capital W should not take all day
const PEN_GAP = 14; // the hand repositioning between letters
const BLANK_MS = 26; // crossing a space
const COMFORT_LAG = 260; // how far behind your fingers the pen may drift
const MAX_LAG = 700; // hard ceiling, so a paste never queues for a minute

type Plan = { delay: number; duration: number };

function schedule(pen: Pen, length: number, speed: number): Plan {
  const now = Date.now();
  const natural =
    length === 0
      ? BLANK_MS
      : Math.min(MAX_MS, Math.max(MIN_MS, length / speed));

  let start = Math.max(now, pen.freeAt);
  let lag = start - now;
  let duration = natural;

  if (lag > COMFORT_LAG) {
    // Behind the typist. Speed the hand up instead of drifting further back —
    // a real hand hurries, it doesn't queue politely.
    const rush = Math.min(2.6, 1 + (lag - COMFORT_LAG) / 420);
    duration = Math.max(45, natural / rush);
    if (lag > MAX_LAG) {
      lag = MAX_LAG;
      start = now + MAX_LAG;
    }
  }

  pen.freeAt = start + duration + PEN_GAP;
  return { delay: lag, duration };
}

// ─── One pen-down stroke ─────────────────────────────────
const Stroke = memo(function Stroke({
  stroke,
  startAt,
  total,
  progress,
  color,
  strokeWidth,
}: {
  stroke: HandwritingStroke;
  /** How far into the glyph's total travel this stroke begins. */
  startAt: number;
  total: number;
  progress: SharedValue<number>;
  color: string;
  strokeWidth: number;
}) {
  const length = stroke.length;
  const animatedProps = useAnimatedProps(() => {
    const drawn = Math.min(Math.max(progress.value * total - startAt, 0), length);
    return { strokeDashoffset: length - drawn };
  });

  return (
    <AnimatedPath
      d={stroke.d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      // +1 so floating-point rounding can never leave a stray dot behind.
      strokeDasharray={[length, length + 1]}
      animatedProps={animatedProps}
    />
  );
});

// ─── One letter, drawing ─────────────────────────────────
const DrawingGlyph = memo(function DrawingGlyph({
  glyph,
  pen,
  speed,
  color,
  strokeWidth,
  onDone,
}: {
  glyph: HandwritingGlyph;
  pen: Pen;
  speed: number;
  color: string;
  strokeWidth: number;
  onDone: (index: number) => void;
}) {
  const progress = useSharedValue(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    // Booked exactly once, on mount rather than during render, so the pen clock
    // is never double-charged for the same letter. Sibling effects run in array
    // order, so letters take their slot in the order they were typed.
    const plan = schedule(pen, glyph.totalLength, speed);
    const idle = glyph.totalLength === 0;
    if (!idle) {
      progress.value = withDelay(
        plan.delay,
        // Linear: a hand moves at a roughly constant speed along a letter.
        // Easing here reads as a stutter at every letter boundary.
        withTiming(1, { duration: plan.duration, easing: Easing.linear })
      );
    }
    const t = setTimeout(
      () => done.current(glyph.index),
      plan.delay + plan.duration + (idle ? 0 : 20)
    );
    return () => {
      clearTimeout(t);
      cancelAnimation(progress);
    };
    // Deliberately once per mounted letter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (glyph.totalLength === 0) return null;

  let acc = 0;
  return (
    <>
      {glyph.strokes.map((s, i) => {
        const startAt = acc;
        acc += s.length;
        return (
          <Stroke
            key={i}
            stroke={s}
            startAt={startAt}
            total={glyph.totalLength}
            progress={progress}
            color={color}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </>
  );
});

// ─── The caret ───────────────────────────────────────────
function Caret({
  x,
  y,
  size,
  color,
  still,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  still: boolean;
}) {
  const blink = useSharedValue(1);

  useEffect(() => {
    if (still) {
      blink.value = 1;
      return;
    }
    blink.value = withRepeat(
      withTiming(0.12, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(blink);
  }, [still, blink]);

  const style = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: x + size * 0.16, // ride the slant, so it sits with the letters
          top: y - size,
          width: 1.5,
          height: size * 1.18,
          backgroundColor: color,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

// ─── The field ───────────────────────────────────────────
export type HandwritingTextProps = {
  text: string;
  /** Available width in px, from onLayout. Nothing renders until it is known. */
  width: number;
  /** Ascender height in px — how tall a capital letter stands. */
  fontSize?: number;
  color?: string;
  strokeWidth?: number;
  /** false renders instantly and fully drawn (saved entries, reduce motion). */
  animate?: boolean;
  /** Character offset to park the caret at, or null for no caret. */
  caretIndex?: number | null;
  onHeightChange?: (height: number) => void;
};

function HandwritingTextInner({
  text,
  width,
  fontSize = 19,
  color = C.label,
  strokeWidth = 1.8,
  animate = false,
  caretIndex = null,
  onHeightChange,
}: HandwritingTextProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const drawing = animate && !reduceMotion;

  // Before the first onLayout we don't know the width. Lay out on one long
  // line rather than at width 0, which would wrap after every letter and
  // report a nonsense height for a frame.
  const layout: HandwritingLayout = useMemo(
    () => layoutHandwriting(text, { fontSize, maxWidth: width > 0 ? width : 10000 }),
    [text, fontSize, width]
  );

  // Letters at indices < settled are finished and live in the merged path.
  // Text that is already there when the field mounts (an in-progress draft you
  // came back to) starts settled — only what you type now gets written.
  const [settled, setSettled] = useState(() => text.length);
  const previous = useRef(text);
  const pen = useRef<Pen>({ freeAt: 0 });

  useEffect(() => {
    const before = previous.current;
    previous.current = text;

    if (!drawing) {
      setSettled(text.length);
      pen.current.freeAt = 0;
      return;
    }
    // Everything up to the first character that changed stays written; the rest
    // is re-drawn. Appending keeps the whole line; an edit rewrites the tail.
    let common = 0;
    const max = Math.min(before.length, text.length);
    while (common < max && before[common] === text[common]) common++;
    setSettled((s) => Math.min(s, common));
    if (text.length === 0) pen.current.freeAt = 0;
  }, [text, drawing]);

  const settledCount = Math.min(settled, layout.glyphs.length);

  const settledPath = useMemo(
    () => mergePaths(layout.glyphs.slice(0, settledCount)),
    [layout, settledCount]
  );

  const settle = useCallback((index: number) => {
    setSettled((s) => Math.max(s, index + 1));
  }, []);

  const height = layout.height;
  const report = useRef(onHeightChange);
  report.current = onHeightChange;
  useEffect(() => {
    report.current?.(height);
  }, [height]);

  // Park the caret at the pen, not ahead of it: while the hand is catching up
  // the caret sits where the ink is, and once it has caught up (or you tapped
  // somewhere else) it sits exactly where the next letter will land.
  const caret = useMemo(() => {
    if (caretIndex == null) return null;
    const i = Math.max(0, Math.min(caretIndex, settledCount, layout.glyphs.length));
    const g = layout.glyphs[i];
    if (g) return { x: g.x, y: g.baselineY };
    const last = layout.glyphs[layout.glyphs.length - 1];
    return last
      ? { x: last.x + last.advance, y: last.baselineY }
      : { x: 0, y: layout.firstBaseline };
  }, [caretIndex, settledCount, layout]);

  if (width <= 0) return <View style={{ height }} />;

  // Speed in px/ms, tied to size so big and small text feel like one hand.
  const speed = fontSize * 0.0145;

  return (
    <View
      style={[styles.field, { height }]}
      pointerEvents="none"
      // The real TextInput underneath carries the text for VoiceOver; this
      // layer is decoration and must not be announced twice.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        {settledPath.length > 0 && (
          <Path
            d={settledPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {drawing &&
          layout.glyphs.slice(settledCount).map((g) => (
            <DrawingGlyph
              // Keyed on the character AND its index, so replacing a letter in
              // place mounts a fresh one that draws again.
              key={`${g.index}:${g.char}`}
              glyph={g}
              pen={pen.current}
              speed={speed}
              color={color}
              strokeWidth={strokeWidth}
              onDone={settle}
            />
          ))}
      </Svg>
      {caret && (
        <Caret
          x={caret.x}
          y={caret.y}
          size={fontSize}
          color={color}
          still={reduceMotion}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { width: "100%", overflow: "visible" },
});

export const HandwritingText = memo(HandwritingTextInner);
export default HandwritingText;
