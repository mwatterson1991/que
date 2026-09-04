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
import { Button, IconButton, Txt, Icon } from "@/components/ui";
import { Glass, GLASS_AVAILABLE, GLASS_FALLBACK } from "@/components/cardLayout";
import { C, R, SP } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

/**
 * goodnight.tsx — the wind-down.
 *
 * Opens on a short card that says what this is, because "a screen that
 * suddenly plays a video" is not self-explanatory. Begin starts thirty
 * seconds that walk the light down: sunset, dusk, moon, stars, animals
 * asleep. The images darken as they go and the sound thins out, so the
 * screen you're holding is dimmer at the end than the room.
 *
 * Deliberately built from modules the app already ships — no screen-
 * brightness API — so it travels over the air instead of waiting on a
 * new build. The perceived dimming is a black veil that deepens with
 * the sequence, which lands the same way and costs nothing.
 *
 * Presented like the player (a full-screen modal that rises from the
 * bottom) and dressed like it: the same close disc top-left, the same
 * glass dock at the foot for the end card. The dock's numbers are copied
 * from the player's rather than shared, so the two can drift on purpose.
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
const TOTAL_SEC = Math.round(TOTAL_MS / 1000);

// Which slots actually carry words — the panel below has to know when to be
// there, and it can't ask the FRAMES array from inside a worklet.
const LINE_INDICES = FRAMES.map((f, i) => (f.line ? i : -1)).filter((i) => i >= 0);

type Phase = "intro" | "playing" | "done";

function formatTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ─── Audio bed ───────────────────────────────────────────
//
// Everything the crickets need lives here, in one place, on purpose.
// The founder wants a mini-player later — the bed keeps playing after
// you leave this screen, with a small control elsewhere — and that is
// to be built "in a very calculated way", not now. When it is, this
// function moves to a lib module and hands its player to a shared
// controller instead of the screen's ref; the screen itself only has to
// stop calling `releasePlayer` in its unmount. Nothing here changes
// behaviour today: the bed starts on Begin and is released on leave.

async function startAudioBed(): Promise<AudioPlayer> {
  await configureAudio();
  const p = createAudioPlayer(require("../assets/audio/ambient-crickets.m4a"));
  p.loop = true;
  p.volume = 0;
  p.play();
  fadePlayerTo(p, 0.28, 4000);
  return p;
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

// ─── The intro card ──────────────────────────────────────
// What you are about to see, and one button. The sequence does not start
// until Begin, so nobody is surprised by a slideshow.
function Intro({ onBegin, onLeave }: { onBegin: () => void; onLeave: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.intro,
        { paddingTop: insets.top + SP.xxxl, paddingBottom: Math.max(insets.bottom, SP.lg) + SP.xl },
      ]}
    >
      <View style={styles.introBody}>
        <Icon name="moon" size={28} color={C.labelSecondary} />
        <Txt kind="largeTitle" style={styles.introTitle}>Wind down</Txt>
        <Txt kind="body" tone="secondary" style={styles.introText}>
          A {TOTAL_SEC}-second wind-down: curated imagery, sound and light, designed to settle your
          body for sleep. Use it while you set tomorrow's alarm and pick your habits.
        </Txt>
      </View>
      <View style={styles.introActions}>
        <Button title="Begin" tone="prominent" onPress={onBegin} />
        <Button title="Not tonight" tone="plain" onPress={onLeave} haptic={false} />
      </View>
    </View>
  );
}

export default function GoodnightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { alarms } = useAlarms();
  const [phase, setPhase] = useState<Phase>("intro");
  const [reduceMotion, setReduceMotion] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const t = useSharedValue(0);
  const veil = useSharedValue(0);

  const playing = phase === "playing";
  const done = phase === "done";

  const nextAlarm = alarms
    .filter((a) => a.enabled)
    .sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at))[0];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    // Warm the first frames while the card is up so Begin lands on a
    // picture, not a black wait.
    FRAMES.slice(0, 3).forEach((f) => { Image.prefetch(f.uri).catch(() => {}); });
  }, []);

  useEffect(() => {
    if (!playing) return;

    // Linear, because any easing here reads as the sequence "hurrying"
    t.value = withTiming(FRAMES.length - 1, {
      duration: TOTAL_MS,
      easing: Easing.linear,
    });
    // The veil deepens the whole way down — the screen ends dimmer than the room
    veil.value = withTiming(0.72, { duration: TOTAL_MS, easing: Easing.in(Easing.quad) });

    const finish = setTimeout(() => {
      setPhase("done");
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Soft);
    }, TOTAL_MS);

    // Thin the sound out over the last stretch so silence arrives first
    const thin = setTimeout(() => {
      if (playerRef.current) fadePlayerTo(playerRef.current, 0.06, 8000);
    }, TOTAL_MS - 9000);

    let cancelled = false;
    startAudioBed()
      .then((p) => {
        if (cancelled) releasePlayer(p);
        else playerRef.current = p;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      clearTimeout(finish);
      clearTimeout(thin);
      if (playerRef.current) {
        releasePlayer(playerRef.current);
        playerRef.current = null;
      }
    };
  }, [playing, t, veil]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const endStyle = useAnimatedStyle(() => ({
    opacity: withTiming(done ? 1 : 0, { duration: 900 }),
  }));

  // The same close disc as the player's, above everything, at every
  // point in the sequence. Swiping the modal down closes it too.
  const close = (
    <View style={[styles.topBar, { paddingTop: insets.top + SP.xs }]}>
      <IconButton icon="x" label="Close" disc size={26} onPress={() => router.back()} />
    </View>
  );

  if (phase === "intro") {
    return (
      <View style={styles.container}>
        <Intro onBegin={() => setPhase("playing")} onLeave={() => router.back()} />
        {close}
      </View>
    );
  }

  return (
    <Pressable
      style={styles.container}
      onPress={() => playing && setPhase("done")}
      accessibilityRole="button"
      accessibilityLabel={done ? "Wind-down finished" : "Skip to the end of the wind-down"}
    >
      {FRAMES.map((f, i) => (
        <Frame key={f.uri} uri={f.uri} index={i} t={t} reduceMotion={reduceMotion} />
      ))}

      {/* The light going down */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} pointerEvents="none" />

      {/* The words. Gated on playing so a tap-to-skip doesn't leave an
          orphan panel sitting under the end card. */}
      {playing && (
        <LinePanel t={t}>
          {FRAMES.map((f, i) =>
            f.line ? <Line key={`l-${i}`} text={f.line} index={i} t={t} /> : null,
          )}
        </LinePanel>
      )}

      {/* The end: the player's glass dock, holding the next alarm and
          one button, at the foot of the screen */}
      {done && (
        <Animated.View
          style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, SP.lg) }, endStyle]}
        >
          <Glass glassEffectStyle="clear" style={[styles.dock, !GLASS_AVAILABLE && GLASS_FALLBACK]}>
            <Txt kind="title2">Goodnight</Txt>
            <Txt kind="subheadline" tone="secondary" style={styles.dockMeta}>
              {nextAlarm
                ? `${formatTime(nextAlarm.next_fire_at)} · ${nextAlarm.label}`
                : "No alarm set for the morning"}
            </Txt>
            <Button title="Lights out" tone="prominent" onPress={() => router.back()} />
          </Glass>
        </Animated.View>
      )}

      {playing && (
        <View style={[styles.skipHint, { top: insets.top + height * 0.02 }]} pointerEvents="none">
          <Txt kind="footnote" tone="tertiary">Tap anywhere to finish</Txt>
        </View>
      )}

      {close}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  veil: { backgroundColor: C.bg },

  // Top chrome, laid over whatever the screen is showing
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SP.md,
    paddingBottom: SP.sm,
  },

  intro: {
    flex: 1,
    paddingHorizontal: SP.xl,
    justifyContent: "space-between",
  },
  introBody: {
    alignItems: "center",
  },
  introTitle: {
    marginTop: SP.md,
    textAlign: "center",
  },
  introText: {
    marginTop: SP.md,
    textAlign: "center",
  },
  introActions: {
    gap: SP.sm,
  },

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
  // The end dock: the player's floating sheet of glass, same inset,
  // same corner, same padding.
  dockWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SP.md,
  },
  dock: {
    borderRadius: R.xxl,
    overflow: "hidden",
    paddingHorizontal: SP.xl,
    paddingTop: SP.lg,
    paddingBottom: SP.md + SP.lg,
  },
  dockMeta: {
    marginTop: SP.xs,
    marginBottom: SP.xl,
  },
  skipHint: {
    position: "absolute",
    alignSelf: "center",
  },
});
