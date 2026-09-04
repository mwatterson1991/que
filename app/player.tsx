import { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  SharedValue,
} from "react-native-reanimated";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { useSessions, useActivity, useProfile, useCategories, usePreferences } from "@/lib/useSupabase";
import { setPickedSound } from "@/lib/soundPicker";
import {
  resolveSource,
  playSession,
  pauseSession,
  resumeSession,
  seekSession,
  stopSession,
  SessionPlaybackStatus,
} from "@/lib/audio";
import {
  playAlarmSession,
  stopAlarmSession,
  skipFadeIn,
} from "@/lib/alarmAudio";
import {
  startAmbient,
  pauseAmbient,
  resumeAmbient,
  stopAmbient,
  AmbientSoundId,
} from "@/lib/ambient";
import { artworkFor, displayTitle, displayDescription, isHypnotherapy } from "@/lib/catalog";
import { usePremium, isLocked } from "@/lib/premium";
import { Button, IconButton, Icon, Txt, type IconName } from "@/components/ui";
import { Artwork } from "@/components/SessionCard";
import { Glass, GLASS_AVAILABLE, GLASS_FALLBACK } from "@/components/cardLayout";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

const { width: SCREEN_W } = Dimensions.get("window");
const ORB_RADIUS = 38;
const ORB_SIZE = ORB_RADIUS * 2 + 24;
const SWING_RANGE = SCREEN_W / 2 - ORB_SIZE / 2 - 20;
// The dock is a glass sheet inset from the screen edges; the scrub
// track is inset again by the dock's own padding.
const DOCK_MARGIN = SP.md;
const DOCK_PAD = SP.xl;
const TRACK_WIDTH = SCREEN_W - DOCK_MARGIN * 2 - DOCK_PAD * 2;
const PARTICLE_COUNT = 72;
const MANTRA_GAP = 20;
const TELEPROMPTER_PAD = 400; // static padding so item y positions never shift

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Fibonacci sphere distribution ───────────────────────
const BASE_PARTICLES = (() => {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    return {
      x: Math.cos(theta) * r * ORB_RADIUS,
      y: y * ORB_RADIUS,
      z: Math.sin(theta) * r * ORB_RADIUS,
    };
  });
})();

// ─── Single particle ─────────────────────────────────────
// Flat dots in the accent: the near face at full strength, the far side
// fading out. Depth comes from size and opacity, never from a glow.
function OrbParticle({
  bx, by, z, exp,
}: {
  bx: number; by: number; z: number; exp: SharedValue<number>;
}) {
  const depth = (z / ORB_RADIUS + 1) / 2;
  const size = 1 + depth * 1.5;
  const opacity = 0.1 + depth * 0.9;

  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bx * exp.value },
      { translateY: by * exp.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: C.accent,
          opacity,
          left: ORB_SIZE / 2 - size / 2,
          top: ORB_SIZE / 2 - size / 2,
        },
        aStyle,
      ]}
    />
  );
}

// ─── Particle orb with pendulum motion ───────────────────
function HypnoticOrb({ playing }: { playing: boolean }) {
  const translateX = useSharedValue(0);

  // Expansion derived directly from pendulum position:
  // contracted at edges (|x| == SWING_RANGE), expanded at center (x == 0)
  const exp = useDerivedValue(() => {
    const normalized = Math.abs(translateX.value) / SWING_RANGE;
    return 1.0 - 0.45 * normalized;
  });

  useEffect(() => {
    if (playing) {
      translateX.value = withRepeat(
        withSequence(
          withTiming(SWING_RANGE, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-SWING_RANGE, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      translateX.value = withTiming(0, { duration: 1200, easing: Easing.out(Easing.quad) });
    }
  }, [playing]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.orbTrack}>
      <Animated.View style={[{ width: ORB_SIZE, height: ORB_SIZE }, orbStyle]}>
        {BASE_PARTICLES.map((p, i) => (
          <OrbParticle key={i} bx={p.x} by={p.y} z={p.z} exp={exp} />
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Teleprompter mantra display ─────────────────────────
// The two edge fades let the lines enter and leave softly: ground
// colour fading to clear, over the artwork.
function EdgeFade({ side }: { side: "top" | "bottom" }) {
  const id = side === "top" ? "fadeTop" : "fadeBottom";
  return (
    <View style={side === "top" ? styles.fadeTop : styles.fadeBottom} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={C.bg} stopOpacity={side === "top" ? 0.7 : 0} />
            <Stop offset="100%" stopColor={C.bg} stopOpacity={side === "top" ? 0 : 0.7} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function MantraTeleprompter({
  mantras,
  activeMantra,
}: {
  mantras: string[];
  activeMantra: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  // All refs — no state — so callbacks never capture stale values
  const containerHRef = useRef(0);
  const itemYRef = useRef<number[]>([]);
  const itemHRef = useRef<number[]>([]);

  const scrollToIndex = (idx: number, animated: boolean) => {
    const cH = containerHRef.current;
    const y = itemYRef.current[idx];
    const h = itemHRef.current[idx];
    if (cH === 0 || y === undefined || h === undefined || !scrollRef.current) return;
    // y includes TELEPROMPTER_PAD offset, so math is straightforward
    const target = y - cH / 2 + h / 2;
    scrollRef.current.scrollTo({ y: Math.max(0, target), animated });
  };

  useEffect(() => {
    scrollToIndex(activeMantra, true);
  }, [activeMantra]);

  return (
    <View
      style={styles.mantraArea}
      onLayout={(e) => {
        containerHRef.current = e.nativeEvent.layout.height;
        scrollToIndex(activeMantra, false);
      }}
    >
      <ScrollView
        ref={scrollRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        // Static padding so item y values never shift after first layout
        contentContainerStyle={{ paddingVertical: TELEPROMPTER_PAD }}
      >
        {mantras.map((m, i) => (
          <View
            key={i}
            onLayout={(e) => {
              itemYRef.current[i] = e.nativeEvent.layout.y;
              itemHRef.current[i] = e.nativeEvent.layout.height;
              // Scroll to center item 0 as soon as it (and the container) are measured
              if (i === activeMantra) scrollToIndex(activeMantra, false);
            }}
            style={{ marginBottom: MANTRA_GAP }}
          >
            <Txt
              kind="title2"
              style={[styles.mantraText, { color: i === activeMantra ? C.label : C.labelQuaternary }]}
              maxFontSizeMultiplier={1.3}
            >
              {m}
            </Txt>
          </View>
        ))}
      </ScrollView>

      <EdgeFade side="top" />
      <EdgeFade side="bottom" />
    </View>
  );
}

// ─── Transport glyphs ────────────────────────────────────
// Apple Music's idiom: bare white glyphs, the play/pause one biggest.
function Transport({
  icon,
  label,
  size,
  onPress,
}: {
  icon: IconName;
  label: string;
  size: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.transportBtn, pressed && { opacity: PRESS_OPACITY }]}
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={size} color={C.label} />
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function PlayerScreen() {
  const { id, alarm, pick } = useLocalSearchParams<{ id: string; alarm?: string; pick?: string }>();
  const isAlarmMode = alarm === "1";
  const isPickMode = pick === "1";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessions } = useSessions();
  const { add: logActivity } = useActivity();
  const { profile, update: updateProfile } = useProfile();
  const { categories, updateProgress } = useCategories();
  const { prefs } = usePreferences();
  const { unlocked } = usePremium();

  const session = sessions.find((s) => s.id === id) ?? null;

  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeMantra, setActiveMantra] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const startedRef = useRef(false);
  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);

  useEffect(() => {
    if (!session || startedRef.current) return;

    // Premium gate — but never in front of a ringing alarm
    if (!isAlarmMode && isLocked(session, unlocked)) {
      router.replace(`/paywall?id=${session.id}` as any);
      return;
    }
    startedRef.current = true;

    setDuration(session.duration_sec);

    const onStatus = (status: SessionPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (!scrubbing) setElapsed(Math.floor(status.positionMillis / 1000));
      setPlaying(status.isPlaying);
      if (status.durationMillis) setDuration(Math.floor(status.durationMillis / 1000));
      if (status.didJustFinish) { setPlaying(false); setCompleted(true); stopAmbient(); }
    };

    if (isAlarmMode) {
      // Alarm mode: gentle 30-second volume fade-in with error fallback
      playAlarmSession(session.audio_url, session.audio_asset, onStatus);
    } else {
      // Normal mode: instant full-volume playback
      const source = resolveSource(session.audio_url, session.audio_asset);
      if (!source) return;
      playSession(source, onStatus);
    }

    // Start ambient layer based on user preference
    const ambientId = (prefs?.ambient_sound as AmbientSoundId) ?? "silence";
    startAmbient(ambientId);

    setPlaying(true);
    return () => {
      if (isAlarmMode) stopAlarmSession();
      else stopSession();
      stopAmbient();
    };
  }, [session, isAlarmMode]);

  useEffect(() => {
    if (!playing || !session?.mantras?.length) return;
    const t = setInterval(() => {
      setActiveMantra((a) => (a + 1) % session.mantras.length);
    }, 8000);
    return () => clearInterval(t);
  }, [playing, session?.mantras?.length]);

  const loggedRef = useRef(false);
  useEffect(() => {
    if (!completed || !session || loggedRef.current) return;
    loggedRef.current = true;
    const durationMin = Math.round(session.duration_sec / 60);
    logActivity({
      title: session.title,
      description: `Completed ${durationMin} min ${session.category.toLowerCase()} session`,
      category: session.category,
      duration_min: durationMin,
    });
    if (profile) {
      updateProfile({
        sessions_completed: (profile.sessions_completed ?? 0) + 1,
        total_hours: Number(((profile.total_hours ?? 0) + durationMin / 60).toFixed(1)),
        score: (profile.score ?? 0) + 10,
      });
    }
    const cat = categories.find((c) => c.name.toLowerCase() === session.category.toLowerCase());
    if (cat) updateProgress(cat.id, Math.min(100, (cat.progress ?? 0) + 5));
  }, [completed, session]);

  const clampScrub = (pageX: number) => {
    const rel = pageX - trackXRef.current;
    return Math.max(0, Math.min(1, rel / TRACK_WIDTH));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        setScrubbing(true);
        setScrubPos(clampScrub(e.nativeEvent.pageX));
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        setScrubPos(clampScrub(e.nativeEvent.pageX));
      },
      onPanResponderRelease: (e: GestureResponderEvent) => {
        const frac = clampScrub(e.nativeEvent.pageX);
        const targetSec = Math.floor(frac * duration);
        setElapsed(targetSec);
        seekSession(targetSec * 1000);
        setScrubbing(false);
      },
    }),
  ).current;

  const togglePlay = async () => {
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    if (playing) {
      await pauseSession();
      await pauseAmbient();
      // User is awake — skip remaining fade-in on next resume
      if (isAlarmMode) await skipFadeIn();
    } else {
      await resumeSession();
      await resumeAmbient();
    }
  };

  const skip = async (delta: number) => {
    Haptics?.selectionAsync?.();
    const target = Math.max(0, Math.min(duration, elapsed + delta));
    setElapsed(target);
    await seekSession(target * 1000);
  };

  const handleSetAsAlarm = () => {
    if (session) setPickedSound(session.id);
    if (isPickMode) {
      // Came from the alarm editor's picker: pop player + picker
      router.back();
      router.back();
    } else {
      router.push("/alarm-config" as any);
    }
  };

  const displayElapsed = scrubbing ? Math.floor(scrubPos * duration) : elapsed;
  const progress = duration > 0 ? displayElapsed / duration : 0;
  const mantras = session?.mantras ?? [];
  // Hypnotherapy adds the orb + mantra teleprompter over the artwork;
  // everything else is the picture alone.
  const showOrb = session ? isHypnotherapy(session) : true;
  const title = session ? displayTitle(session) : "Loading…";

  const setAsAlarm = !completed && (
    <Button
      title={isPickMode ? "Use" : "Set as Alarm"}
      tone="gray"
      icon="bell"
      style={styles.selectPill}
      onPress={handleSetAsAlarm}
    />
  );

  return (
    <View style={styles.container}>
      {/* The SAME artwork as the card, with the same treatment, filling
          the screen. The glass dock and the scrim keep the text legible. */}
      {session && <Artwork uri={artworkFor(session)} accessibilityLabel={`${title} artwork`} />}

      {/* Top chrome: close on the left, Set as Alarm on the right */}
      <View style={[styles.topBar, { paddingTop: insets.top + SP.xs }]}>
        <IconButton icon="x" label="Close" disc onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        {setAsAlarm}
      </View>

      {showOrb ? (
        <>
          <HypnoticOrb playing={playing} />
          <MantraTeleprompter mantras={mantras} activeMantra={activeMantra} />
        </>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* The dock: one sheet of glass holding name + scrubber + transport */}
      <View style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, SP.lg) }]}>
        <Glass glassEffectStyle="clear" style={[styles.dock, !GLASS_AVAILABLE && GLASS_FALLBACK]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Txt kind="title3" numberOfLines={1}>{title}</Txt>
              <Txt kind="subheadline" tone="secondary" numberOfLines={1}>{session?.narrator}</Txt>
            </View>
            <IconButton
              icon="info"
              label="Session details"
              size={22}
              color={C.labelSecondary}
              onPress={() => Alert.alert(title, session ? displayDescription(session) : "")}
            />
          </View>

          {/* Progress — a thin channel, white fill, plain thumb */}
          <View style={styles.progressContainer}>
            <View
              ref={trackRef}
              onLayout={() => {
                trackRef.current?.measureInWindow((x) => { trackXRef.current = x; });
              }}
              style={styles.progressTrackOuter}
              {...panResponder.panHandlers}
              accessible={true}
              accessibilityRole="adjustable"
              accessibilityLabel="Playback position"
              accessibilityValue={{ text: `${formatTime(displayElapsed)} of ${formatTime(duration)}` }}
            >
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View
                style={[styles.thumb, { left: `${progress * 100}%` }, scrubbing && styles.thumbActive]}
                pointerEvents="none"
              />
            </View>
            <View style={styles.timeRow}>
              <Txt kind="caption1" tone="secondary">{formatTime(displayElapsed)}</Txt>
              <Txt kind="caption1" tone="secondary">{formatTime(duration)}</Txt>
            </View>
          </View>

          {/* Transport. Play is the biggest glyph — the one thing you reach
              for half-awake. */}
          <View style={styles.transport}>
            <Transport icon="rewind" label="Back 15 seconds" size={30} onPress={() => skip(-15)} />
            <Transport
              icon={playing ? "pause" : "play"}
              label={playing ? "Pause session" : "Play session"}
              size={52}
              onPress={togglePlay}
            />
            <Transport icon="fast-forward" label="Forward 15 seconds" size={30} onPress={() => skip(15)} />
          </View>

          {completed && (
            <View style={styles.completedRow}>
              <Icon name="check-circle" size={20} />
              <Txt kind="subheadline" tone="secondary">Session complete</Txt>
            </View>
          )}
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SP.md,
    paddingBottom: SP.sm,
  },
  selectPill: {
    alignSelf: "auto",
    minHeight: 40,
    paddingHorizontal: SP.lg,
    backgroundColor: C.overlayFill,
  },

  // Orb
  orbTrack: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SP.xs,
  },

  // Mantras
  mantraArea: {
    flex: 1,
    overflow: "hidden",
  },
  mantraText: {
    paddingHorizontal: SP.xl,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },

  // Dock: a floating sheet of glass, inset from the edges.
  dockWrap: {
    paddingHorizontal: DOCK_MARGIN,
  },
  dock: {
    borderRadius: R.xl,
    overflow: "hidden",
    paddingHorizontal: DOCK_PAD,
    paddingTop: SP.lg,
    paddingBottom: SP.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SP.md,
  },

  // Progress
  progressContainer: {
    marginBottom: SP.sm,
  },
  progressTrackOuter: {
    height: 24,
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    backgroundColor: C.fillHighest,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    top: 5,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: C.label,
  },
  thumbActive: {
    transform: [{ scale: 1.3 }],
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },

  // Controls
  transport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.xxxl,
    marginTop: SP.xs,
  },
  transportBtn: {
    minWidth: SP.hit,
    minHeight: SP.hit,
    alignItems: "center",
    justifyContent: "center",
  },

  // Completion
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.sm,
    paddingTop: SP.lg,
  },
});
