import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  AccessibilityInfo,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { fadePlayerTo, releasePlayer, configureAudio } from "@/lib/audio";
import { useAlarms } from "@/lib/useSupabase";
import { useBackdrop } from "@/lib/backdrop";
import { F, S } from "@/lib/fonts";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

/**
 * goodnight.tsx — the wind-down.
 *
 * Thirty seconds that walk the light down: sunset, dusk, moon, stars,
 * animals asleep. The images darken as they go and the sound thins out,
 * so the screen you're holding is dimmer at the end than the room.
 *
 * Deliberately built from modules the app already ships — no screen-
 * brightness API — so it travels over the air instead of waiting on a
 * new build. The perceived dimming is a black veil that deepens with
 * the sequence, which lands the same way and costs nothing.
 */

const pex = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

// The arc matters more than any single frame: the sky lets go, then the
// moon takes over, then the stars, then something small falls asleep.
const FRAMES: { uri: string; line?: string }[] = [
  { uri: pex(30923401), line: "The day is finished with you." },
  { uri: pex(17703237) },
  { uri: pex(3638046), line: "Let your shoulders down." },
  { uri: pex(27500643) },
  { uri: pex(12863822), line: "Breathe out slower than you breathe in." },
  { uri: pex(6881068) },
  { uri: pex(35086600), line: "Nothing else needs you tonight." },
  { uri: pex(13444719) },
  { uri: pex(27489837) },
  { uri: pex(4062842), line: "Everything is going to sleep." },
  { uri: pex(32960962) },
  { uri: pex(16664165) },
];

const PER_FRAME_MS = 2500;
const TOTAL_MS = FRAMES.length * PER_FRAME_MS;

function formatTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function Frame({
  uri,
  index,
  t,
  reduceMotion,
}: {
  uri: string;
  index: number;
  t: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // Each frame owns one slot and cross-fades with its neighbours, so
    // there is never a black gap between images.
    const opacity = interpolate(
      t.value,
      [index - 0.85, index, index + 0.85],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const scale = reduceMotion
      ? 1
      : interpolate(t.value, [index - 1, index + 1], [1.06, 1.14], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
    </Animated.View>
  );
}

function Line({ text, index, t }: { text: string; index: number; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      t.value,
      [index - 0.55, index, index + 0.9, index + 1.35],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View style={[styles.lineWrap, style]} pointerEvents="none">
      <Text style={styles.line}>{text}</Text>
    </Animated.View>
  );
}

export default function GoodnightScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { alarms } = useAlarms();
  const { setStageDark } = useBackdrop();
  const [done, setDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const t = useSharedValue(0);
  const veil = useSharedValue(0);

  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at))[0];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    // Linear, because any easing here reads as the sequence "hurrying"
    t.value = withTiming(FRAMES.length - 1, {
      duration: TOTAL_MS,
      easing: Easing.linear,
    });
    // The veil deepens the whole way down — the screen ends dimmer than the room
    veil.value = withTiming(0.72, { duration: TOTAL_MS, easing: Easing.in(Easing.quad) });

    const finish = setTimeout(() => {
      setDone(true);
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Soft);
    }, TOTAL_MS);

    (async () => {
      try {
        await configureAudio();
        const p = createAudioPlayer(require("../assets/audio/ambient-crickets.m4a"));
        p.loop = true;
        p.volume = 0;
        p.play();
        playerRef.current = p;
        fadePlayerTo(p, 0.28, 4000);
        // Thin the sound out over the last stretch so silence arrives first
        setTimeout(() => { if (playerRef.current) fadePlayerTo(playerRef.current, 0.06, 8000); }, TOTAL_MS - 9000);
      } catch {}
    })();

    return () => {
      clearTimeout(finish);
      if (playerRef.current) {
        releasePlayer(playerRef.current);
        playerRef.current = null;
      }
    };
  }, [t, veil]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const endStyle = useAnimatedStyle(() => ({
    opacity: withTiming(done ? 1 : 0, { duration: 900 }),
  }));

  const leave = (lightsOut: boolean) => {
    if (lightsOut) setStageDark(true);
    router.back();
  };

  return (
    <Pressable
      style={styles.container}
      onPress={() => !done && setDone(true)}
      accessibilityRole="button"
      accessibilityLabel={done ? "Wind-down finished" : "Skip to the end of the wind-down"}
    >
      {FRAMES.map((f, i) => (
        <Frame key={f.uri} uri={f.uri} index={i} t={t} reduceMotion={reduceMotion} />
      ))}

      {/* The light going down */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} pointerEvents="none" />

      {FRAMES.map((f, i) =>
        f.line ? <Line key={`l-${i}`} text={f.line} index={i} t={t} /> : null,
      )}

      {/* The end card */}
      {done && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.endWrap, endStyle]}>
          <Ionicons name="moon" size={30} color="rgba(255,255,255,0.85)" />
          <Text style={styles.goodnight}>Goodnight</Text>
          {nextAlarm ? (
            <Text style={styles.endMeta}>
              {formatTime(nextAlarm.next_fire_at)} · {nextAlarm.label}
            </Text>
          ) : (
            <Text style={styles.endMeta}>No alarm set for the morning</Text>
          )}

          <View style={{ height: 34 }} />

          <Pressable
            onPress={() => leave(true)}
            style={styles.primary}
            accessibilityRole="button"
            accessibilityLabel="Lights out and close"
          >
            <Text style={styles.primaryText}>Lights out</Text>
          </Pressable>
          <Pressable
            onPress={() => leave(false)}
            style={styles.secondary}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.secondaryText}>Not yet</Text>
          </Pressable>
        </Animated.View>
      )}

      {!done && (
        <View style={[styles.skipHint, { top: height * 0.06 }]} pointerEvents="none">
          <Text style={styles.skipText}>Tap anywhere to finish</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  veil: { backgroundColor: "#000000" },
  lineWrap: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: "22%",
    alignItems: "center",
  },
  line: {
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: "Lora",
    lineHeight: 34,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  endWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  goodnight: {
    color: "#ffffff",
    fontSize: S.display,
    fontFamily: "Lora",
    marginTop: 14,
  },
  endMeta: {
    color: "rgba(255,255,255,0.66)",
    fontSize: S.secondary,
    fontFamily: F.regular,
    marginTop: 8,
  },
  primary: {
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 44,
  },
  primaryText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  secondary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  secondaryText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: S.secondary,
    fontFamily: F.regular,
  },
  skipHint: {
    position: "absolute",
    alignSelf: "center",
  },
  skipText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: S.caption,
    fontFamily: F.regular,
  },
});
