import { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  AccessibilityInfo,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Button, Txt } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";

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

// Which slots actually carry words — the panel below has to know when to be
// there, and it can't ask the FRAMES array from inside a worklet.
const LINE_INDICES = FRAMES.map((f, i) => (f.line ? i : -1)).filter((i) => i >= 0);

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
      <Txt kind="editorial" style={styles.line} numberOfLines={3} maxFontSizeMultiplier={1.2}>
        {text}
      </Txt>
    </Animated.View>
  );
}

/**
 * The surface the words live on: a flat tile of the chrome colour that
 * arrives a beat BEFORE the first word of a line and leaves a beat after
 * the last, so a line never has to fade up onto bare photograph.
 */
function LinePanel({ t, children }: { t: SharedValue<number>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    let o = 0;
    for (let k = 0; k < LINE_INDICES.length; k++) {
      const i = LINE_INDICES[k];
      const v = interpolate(
        t.value,
        [i - 0.8, i - 0.35, i + 0.95, i + 1.5],
        [0, 1, 1, 0],
        Extrapolation.CLAMP,
      );
      if (v > o) o = v;
    }
    return { opacity: o };
  });

  return (
    <Animated.View style={[styles.panelWrap, style]} pointerEvents="none">
      <View style={styles.panel}>{children}</View>
    </Animated.View>
  );
}

export default function GoodnightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { alarms } = useAlarms();
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

      {/* The words. Gated on !done so a tap-to-skip doesn't leave an orphan
          panel sitting under the end card. */}
      {!done && (
        <LinePanel t={t}>
          {FRAMES.map((f, i) =>
            f.line ? <Line key={`l-${i}`} text={f.line} index={i} t={t} /> : null,
          )}
        </LinePanel>
      )}

      {/* The end: the next alarm and one button, at the foot of the screen */}
      {done && (
        <Animated.View
          style={[styles.endWrap, { paddingBottom: Math.max(insets.bottom, SP.lg) + SP.xl }, endStyle]}
        >
          <Ionicons name="moon" size={28} color={C.labelSecondary} />
          <Txt kind="largeTitle" style={styles.goodnight}>Goodnight</Txt>
          <Txt kind="subheadline" tone="secondary" style={styles.endMeta}>
            {nextAlarm
              ? `${formatTime(nextAlarm.next_fire_at)} · ${nextAlarm.label}`
              : "No alarm set for the morning"}
          </Txt>
          <Button title="Lights out" tone="prominent" onPress={() => router.back()} style={styles.primary} />
        </Animated.View>
      )}

      {!done && (
        <View style={[styles.skipHint, { top: insets.top + height * 0.02 }]} pointerEvents="none">
          <Txt kind="footnote" tone="tertiary">Tap anywhere to finish</Txt>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  veil: { backgroundColor: C.bg },
  panelWrap: {
    position: "absolute",
    left: SP.xl,
    right: SP.xl,
    bottom: "18%",
  },
  // Fixed, not min: every line is absolutely positioned so they can
  // cross-fade in the same place, which leaves the panel no intrinsic
  // height of its own. Sized for the longest line at three lines.
  panel: {
    height: 150,
    borderRadius: R.lg,
    backgroundColor: C.overlayFill,
  },
  lineWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SP.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    textAlign: "center",
  },
  endWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: SP.xl,
    paddingTop: SP.xxxl,
    backgroundColor: C.scrim,
  },
  goodnight: {
    marginTop: SP.md,
  },
  endMeta: {
    marginTop: SP.xs,
    marginBottom: SP.xxl,
  },
  primary: {
    alignSelf: "stretch",
  },
  skipHint: {
    position: "absolute",
    alignSelf: "center",
  },
});
