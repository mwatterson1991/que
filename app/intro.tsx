import { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { F, S } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { artworkFor } from "@/lib/catalog";

// ─── First-mile intro ──────────────────────────────────────
// Apple-Music-ad energy: rails of session artwork drift horizontally
// in alternating directions behind a three-step pitch.

const { width: SCREEN_W } = Dimensions.get("window");
const TILE = 104;
const GAP = 10;

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
    <View style={{ height: TILE, marginBottom: GAP, overflow: "hidden", width: SCREEN_W }}>
      <Animated.View style={{ flexDirection: "row", transform: [{ translateX }] }}>
        {[...images, ...images].map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: TILE, height: TILE, borderRadius: 16, marginRight: GAP, backgroundColor: "#1c1c1e" }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      {/* Drifting artwork wall */}
      <View style={styles.marqueeWall} pointerEvents="none">
        {rows.map((imgs, i) => (
          <MarqueeRow
            key={i}
            images={imgs}
            reverse={i % 2 === 1}
            duration={38000 + i * 7000}
          />
        ))}
      </View>

      {/* Scrim so the words own the frame */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="introScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
              <Stop offset="55%" stopColor="#000000" stopOpacity="0.72" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.97" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#introScrim)" />
        </Svg>
      </View>

      {/* Copy + controls */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
        <Text style={styles.kicker} maxFontSizeMultiplier={1.2}>
          {STEPS[step].kicker}
        </Text>
        <Text style={styles.headline} maxFontSizeMultiplier={1.2}>
          {STEPS[step].headline}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={1.3}>
          {STEPS[step].body}
        </Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={styles.cta}
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={last ? "Start using Morning Que" : "Next"}
        >
          <Text style={styles.ctaText}>{last ? "Start your mornings" : "Next"}</Text>
        </Pressable>
        {!last && (
          <Pressable
            onPress={() => router.replace("/alarms")}
            hitSlop={10}
            style={styles.skip}
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  marqueeWall: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
  },
  kicker: {
    color: "rgba(255,255,255,0.55)",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  headline: {
    color: "#f5f5f7",
    fontSize: S.display,
    lineHeight: 42,
    fontFamily: "Lora",
    marginBottom: 12,
  },
  body: {
    color: "#a1a1aa",
    fontSize: S.secondary,
    lineHeight: 23,
    fontFamily: F.regular,
    marginBottom: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 22,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2c2c2e",
  },
  dotActive: {
    backgroundColor: "#f5f5f7",
  },
  cta: {
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: "center",
  },
  ctaText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  skip: {
    alignItems: "center",
    paddingTop: 14,
  },
  skipText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: S.caption,
    fontFamily: F.regular,
  },
});
