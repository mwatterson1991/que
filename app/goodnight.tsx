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
import { Glass, GlassButton } from "@/components/Glass";
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
      <Text style={styles.line} numberOfLines={3} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * The surface the words live on.
 *
 * The lines used to sit straight on the photographs, so they read as
 * captions burned into someone else's picture. Now they cross-fade inside
 * one piece of glass that stays put: the panel arrives a beat BEFORE the
 * first word of a line and leaves a beat after the last, so a line never
 * has to fade up onto bare photograph, and between lines the glass goes
 * with them rather than hanging there empty.
 *
 * Its opacity is the loudest of all the line windows, computed on the UI
 * thread from the same clock the lines use — no second timeline to drift.
 */
function LinePanel({
  t,
  reduceMotion,
  children,
}: {
  t: SharedValue<number>;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
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
      {/* Reduce Motion kills the travelling sheen but keeps the surface —
          the point of the panel is legibility, not the shimmer. */}
      <Glass liquid={!reduceMotion} phase={0.35} intensity={1.05} scrim="soft" style={styles.panel}>
        <View style={styles.panelTopEdge} pointerEvents="none" />
        {children}
      </Glass>
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

      {/* The words, on glass. Gated on !done so a tap-to-skip doesn't leave
          an orphan panel sitting under the end card. */}
      {!done && (
        <LinePanel t={t} reduceMotion={reduceMotion}>
          {FRAMES.map((f, i) =>
            f.line ? <Line key={`l-${i}`} text={f.line} index={i} t={t} /> : null,
          )}
        </LinePanel>
      )}

      {/* The end card */}
      {done && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.endWrap, endStyle]}>
          <View style={styles.endShadow}>
            <Glass
              liquid={!reduceMotion}
              phase={0.2}
              intensity={1.15}
              scrim="soft"
              style={styles.endCard}
            >
              <View style={styles.panelTopEdge} pointerEvents="none" />
              <Ionicons name="moon" size={30} color="rgba(255,255,255,0.85)" />
              <Text style={styles.goodnight}>Goodnight</Text>
              {nextAlarm ? (
                <Text style={styles.endMeta}>
                  {formatTime(nextAlarm.next_fire_at)} · {nextAlarm.label}
                </Text>
              ) : (
                <Text style={styles.endMeta}>No alarm set for the morning</Text>
              )}

              <View style={{ height: 30 }} />

              <Pressable
                onPress={() => leave(true)}
                style={styles.primaryHit}
                accessibilityRole="button"
                accessibilityLabel="Lights out and close"
              >
                <GlassButton tone="bright" phase={0.6} style={styles.primary}>
                  <Text style={styles.primaryText}>Lights out</Text>
                </GlassButton>
              </Pressable>
              <Pressable
                onPress={() => leave(false)}
                style={styles.secondary}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.secondaryText}>Not yet</Text>
              </Pressable>
            </Glass>
          </View>
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
  panelWrap: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: "18%",
  },
  panel: {
    // Fixed, not min: every line is absolutely positioned so they can
    // cross-fade in the same place, which leaves the panel no intrinsic
    // height of its own. Sized for the longest line at two lines of 34.
    height: 124,
    borderRadius: 28,
    overflow: "hidden",
  },
  // Light catching the panel's top face
  panelTopEdge: {
    position: "absolute",
    top: 1,
    left: 34,
    right: 34,
    height: 1,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  lineWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: 26,
  },
  // Outside the clipping glass so the shadow lands, and its dark fill sets
  // the card off the photograph underneath.
  endShadow: {
    alignSelf: "stretch",
    borderRadius: 32,
    backgroundColor: "rgba(6,8,10,0.34)",
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  endCard: {
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 24,
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
  primaryHit: {
    alignSelf: "stretch",
  },
  primary: {
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 15,
    paddingHorizontal: 44,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
    // The button is transparent now, so the label carries its own scrim
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
