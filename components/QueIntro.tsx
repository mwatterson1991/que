import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { C } from "@/lib/tokens";
import { feel } from "@/lib/feel";

/**
 * QueIntro — the Q draws itself in.
 *
 * The first thing on a cold launch: black, then one line traces the ring
 * of the Q, the tail shoots out of it, and the whole mark lifts and
 * dissolves into the app. About a second, once per launch, never on a
 * tab switch or a return from the background.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Geometry in a 200 x 200 box. The ring is a full arc from the top,
// clockwise; the tail leaves the ring at the lower right.
const CX = 100;
const CY = 100;
const R = 60;
const STROKE = 9;
const RING = `M${CX},${CY - R} A${R},${R} 0 1,1 ${CX - 0.01},${CY - R}`;
const RING_LEN = 2 * Math.PI * R;
const TAIL_FROM = { x: 124, y: 124 };
const TAIL_TO = { x: 168, y: 168 };
const TAIL = `M${TAIL_FROM.x},${TAIL_FROM.y} L${TAIL_TO.x},${TAIL_TO.y}`;
const TAIL_LEN = Math.hypot(TAIL_TO.x - TAIL_FROM.x, TAIL_TO.y - TAIL_FROM.y);

// Timing, in ms.
const RING_MS = 620;
const TAIL_AT = 540;
const TAIL_MS = 170;
const HOLD_MS = 140;
const OUT_MS = 300;

let shownThisLaunch = false;

export default function QueIntro() {
  const [done, setDone] = useState(shownThisLaunch);
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.34, 150);

  const ring = useSharedValue(RING_LEN);
  const tail = useSharedValue(TAIL_LEN);
  const fade = useSharedValue(1);
  const lift = useSharedValue(1);

  useEffect(() => {
    if (shownThisLaunch) return;
    shownThisLaunch = true;

    ring.value = withTiming(0, { duration: RING_MS, easing: Easing.out(Easing.cubic) });
    tail.value = withDelay(TAIL_AT, withTiming(0, { duration: TAIL_MS, easing: Easing.out(Easing.quad) }));

    const outAt = TAIL_AT + TAIL_MS + HOLD_MS;
    lift.value = withDelay(outAt, withTiming(1.08, { duration: OUT_MS, easing: Easing.inOut(Easing.quad) }));
    fade.value = withSequence(
      withDelay(outAt, withTiming(0, { duration: OUT_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setDone)(true);
      }))
    );

    const tick = setTimeout(() => feel.tick(), TAIL_AT + TAIL_MS);
    return () => clearTimeout(tick);
  }, [ring, tail, fade, lift]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: ring.value }));
  const tailProps = useAnimatedProps(() => ({ strokeDashoffset: tail.value }));
  const overlay = useAnimatedStyle(() => ({ opacity: fade.value }));
  const mark = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));

  if (done) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlay]} pointerEvents="none">
      <Animated.View style={mark}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <AnimatedPath
            d={RING}
            stroke={C.label}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${RING_LEN} ${RING_LEN}`}
            animatedProps={ringProps}
          />
          <AnimatedPath
            d={TAIL}
            stroke={C.label}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${TAIL_LEN} ${TAIL_LEN}`}
            animatedProps={tailProps}
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
});
