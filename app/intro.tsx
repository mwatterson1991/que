import { useEffect, useRef, useState, useMemo } from "react";
import { View, StyleSheet, Image, Animated, Easing, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, Txt, Button } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";
import { useSessions } from "@/lib/useSupabase";
import { artworkFor } from "@/lib/catalog";

// ─── First-mile intro ──────────────────────────────────────
// Rails of session artwork drift horizontally in alternating directions
// behind a three-step pitch that sits on a flat scrim at the foot.

const { width: SCREEN_W } = Dimensions.get("window");
const TILE = 104;
const GAP = SP.sm;

const STEPS = [
  {
    kicker: "THE PROBLEM",
    headline: "Harsh alarms set your mind to the wrong frequency.",
    body: "A blaring alarm floods your first waking seconds with stress. That jolt colors the whole day.",
  },
  {
    kicker: "THE SCIENCE",
    headline: "Positive words in the morning measurably lift your day.",
    body: "Starting the day with affirming words has been shown to dramatically improve happiness and positivity.",
  },
  {
    kicker: "THE UPGRADE",
    headline: "Wake to horoscopes, hypnotherapy, and pure nature.",
    body: "Daily readings, deep-voice hypnotherapy sessions, binaural frequencies, and real field-recorded naturescapes.",
  },
];

function MarqueeRow({
  images,
  reverse,
  duration,
}: {
  images: string[];
  reverse?: boolean;
  duration: number;
}) {
  const shift = useRef(new Animated.Value(0)).current;
  const rowWidth = images.length * (TILE + GAP);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shift, duration]);

  const translateX = shift.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [-rowWidth, 0] : [0, -rowWidth],
  });

  return (
    <View style={styles.rail}>
      <Animated.View style={{ flexDirection: "row", transform: [{ translateX }] }}>
        {[...images, ...images].map((uri, i) => (
          <Image key={i} accessible={false} source={{ uri }} style={styles.tile} />
        ))}
      </Animated.View>
    </View>
  );
}

export default function IntroScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { sessions } = useSessions();
  const [step, setStep] = useState(0);

  // Split the catalog artwork into rows, one per marquee band
  const rows = useMemo(() => {
    const urls = [...new Set(sessions.map((s) => artworkFor(s)))];
    if (urls.length === 0) return [];
    const perRow = Math.max(4, Math.ceil(urls.length / 4));
    return Array.from({ length: 4 }, (_, i) => {
      const slice = urls.slice(i * perRow, (i + 1) * perRow);
      return slice.length ? slice : urls.slice(0, perRow);
    });
  }, [sessions]);

  const last = step === STEPS.length - 1;
  const next = () => {
    if (last) router.replace("/alarms");
    else setStep((s) => s + 1);
  };

  return (
    <Screen>
      {/* Drifting artwork wall */}
      <View style={[styles.wall, { top: top + SP.lg }]} pointerEvents="none">
        {rows.map((imgs, i) => (
          <MarqueeRow key={i} images={imgs} reverse={i % 2 === 1} duration={38000 + i * 7000} />
        ))}
      </View>

      {/* Copy + controls on a flat scrim */}
      <View style={[styles.foot, { paddingBottom: bottom + SP.lg }]}>
        <Txt kind="footnote" tone="secondary" maxFontSizeMultiplier={1.2} style={styles.kicker}>
          {STEPS[step].kicker}
        </Txt>
        <Txt kind="title1" maxFontSizeMultiplier={1.2} style={styles.headline}>
          {STEPS[step].headline}
        </Txt>
        <Txt kind="body" tone="secondary" maxFontSizeMultiplier={1.3} style={styles.body}>
          {STEPS[step].body}
        </Txt>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Button
          title={last ? "Start your mornings" : "Next"}
          onPress={next}
          accessibilityLabel={last ? "Start using Morning Que" : "Next"}
        />
        {!last && (
          <Button
            title="Skip"
            tone="plain"
            onPress={() => router.replace("/alarms")}
            accessibilityLabel="Skip intro"
            style={styles.skip}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wall: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  rail: {
    height: TILE,
    marginBottom: GAP,
    overflow: "hidden",
    width: SCREEN_W,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: R.lg,
    marginRight: GAP,
    backgroundColor: C.fill,
  },
  foot: {
    marginTop: "auto",
    paddingHorizontal: SP.screen,
    paddingTop: SP.xxl,
    backgroundColor: C.scrim,
  },
  kicker: {
    marginBottom: SP.sm,
  },
  headline: {
    marginBottom: SP.md,
  },
  body: {
    marginBottom: SP.xl,
  },
  dots: {
    flexDirection: "row",
    gap: SP.sm,
    marginBottom: SP.xl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: R.pill,
    backgroundColor: C.fillHighest,
  },
  dotActive: {
    backgroundColor: C.label,
  },
  skip: {
    marginTop: SP.xs,
  },
});
