import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
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
import { Ionicons } from "@expo/vector-icons";
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
import { AVPlaybackStatus } from "expo-av";
import { F } from "@/lib/fonts";
import { useSessions, useActivity, useProfile, useCategories } from "@/lib/useSupabase";
import { setPickedSound } from "@/lib/soundPicker";
import {
  resolveSource,
  playSession,
  pauseSession,
  resumeSession,
  seekSession,
  stopSession,
} from "@/lib/audio";

const { width: SCREEN_W } = Dimensions.get("window");
const ORB_RADIUS = 38;
const ORB_SIZE = ORB_RADIUS * 2 + 24;
const SWING_RANGE = SCREEN_W / 2 - ORB_SIZE / 2 - 20;
const TRACK_PAD = 24;
const TRACK_WIDTH = SCREEN_W - TRACK_PAD * 2;
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
function OrbParticle({
  bx, by, z, exp,
}: {
  bx: number; by: number; z: number; exp: SharedValue<number>;
}) {
  const depth = (z / ORB_RADIUS + 1) / 2;
  const size = 1 + depth * 1.5;
  const opacity = 0.12 + depth * 0.88;
  const color = depth > 0.55 ? "#FF7030" : depth > 0.25 ? "#DD3800" : "#882000";

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
          backgroundColor: color,
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
            <Text
              style={[
                styles.mantraText,
                i === activeMantra ? styles.mantraActive : styles.mantraDim,
              ]}
            >
              {m}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Top fade */}
      <View style={styles.fadeTop} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="gTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="1" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#gTop)" />
        </Svg>
      </View>

      {/* Bottom fade */}
      <View style={styles.fadeBottom} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="gBot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#gBot)" />
        </Svg>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessions } = useSessions();
  const { add: logActivity } = useActivity();
  const { profile, update: updateProfile } = useProfile();
  const { categories, updateProgress } = useCategories();

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
    startedRef.current = true;

    const source = resolveSource(session.audio_url, session.audio_asset);
    if (!source) return;

    setDuration(session.duration_sec);
    playSession(source, (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (!scrubbing) setElapsed(Math.floor(status.positionMillis / 1000));
      setPlaying(status.isPlaying);
      if (status.durationMillis) setDuration(Math.floor(status.durationMillis / 1000));
      if (status.didJustFinish) { setPlaying(false); setCompleted(true); }
    });

    setPlaying(true);
    return () => { stopSession(); };
  }, [session]);

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
    if (playing) await pauseSession();
    else await resumeSession();
  };

  const skip = async (delta: number) => {
    const target = Math.max(0, Math.min(duration, elapsed + delta));
    setElapsed(target);
    await seekSession(target * 1000);
  };

  const handleSetAsAlarm = () => {
    if (session) setPickedSound(session.id);
    router.push("/edit-alarm" as any);
  };

  const displayElapsed = scrubbing ? Math.floor(scrubPos * duration) : elapsed;
  const progress = duration > 0 ? displayElapsed / duration : 0;
  const mantras = session?.mantras ?? [];

  return (
    <View style={styles.container}>
      {/* Nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#f5f5f7" />
        </Pressable>
      </View>

      {/* Particle orb */}
      <HypnoticOrb playing={playing} />

      {/* Teleprompter mantras */}
      <MantraTeleprompter mantras={mantras} activeMantra={activeMantra} />

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session?.title ?? "Loading..."}
          </Text>
          <Pressable
            style={styles.menuButton}
            hitSlop={12}
            onPress={() => Alert.alert(session?.title ?? "", session?.description ?? "")}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#71717a" />
          </Pressable>
        </View>
        <Text style={styles.narrator}>{session?.narrator}</Text>

        {/* Progress bar — no thumb */}
        <View style={styles.progressContainer}>
          <View
            ref={trackRef}
            onLayout={() => {
              trackRef.current?.measureInWindow((x) => { trackXRef.current = x; });
            }}
            style={styles.progressTrackOuter}
            {...panResponder.panHandlers}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(displayElapsed)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Skip back 10s */}
          <Pressable style={styles.controlBtn} onPress={() => skip(-10)} hitSlop={8}>
            <Ionicons
              name="refresh"
              size={22}
              color="#f5f5f7"
              style={{ transform: [{ scaleX: -1 }] }}
            />
            <Text style={styles.skipLabel}>10</Text>
          </Pressable>

          {/* Play / pause */}
          <Pressable style={styles.controlBtn} onPress={togglePlay}>
            <Ionicons
              name={playing ? "pause" : "play"}
              size={26}
              color="#f5f5f7"
              style={!playing ? { marginLeft: 3 } : undefined}
            />
          </Pressable>

          {/* Skip forward 10s */}
          <Pressable style={styles.controlBtn} onPress={() => skip(10)} hitSlop={8}>
            <Ionicons name="refresh" size={22} color="#f5f5f7" />
            <Text style={styles.skipLabel}>10</Text>
          </Pressable>
        </View>

        {/* Completion / alarm */}
        {completed ? (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#34d399" style={{ marginRight: 8 }} />
            <Text style={styles.completedText}>SESSION COMPLETE</Text>
          </View>
        ) : (
          <Pressable style={styles.alarmButton} onPress={handleSetAsAlarm}>
            <Text style={styles.alarmButtonText}>SET AS ALARM</Text>
            <Ionicons name="arrow-forward" size={18} color="#f5f5f7" style={{ marginLeft: 8 }} />
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

  // Nav
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Orb
  orbTrack: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  // Mantras
  mantraArea: {
    flex: 1,
    overflow: "hidden",
  },
  mantraText: {
    fontSize: 24,
    lineHeight: 34,
    fontFamily: F.regular,
    paddingHorizontal: 24,
  },
  mantraActive: {
    color: "#f5f5f7",
  },
  mantraDim: {
    color: "#1e1e20",
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

  // Bottom
  bottomSection: {
    paddingHorizontal: TRACK_PAD,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionTitle: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: 22,
    fontFamily: F.bold,
  },
  menuButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  narrator: {
    color: "#71717a",
    fontSize: 15,
    fontFamily: F.regular,
    marginBottom: 16,
  },

  // Progress (no thumb)
  progressContainer: {
    marginBottom: 14,
  },
  progressTrackOuter: {
    height: 20,
    justifyContent: "center",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#27272a",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#FF5500",
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: {
    color: "#71717a",
    fontSize: 12,
    fontFamily: F.regular,
  },

  // Controls
  controls: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  controlBtn: {
    flex: 1,
    height: 56,
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  skipLabel: {
    color: "#71717a",
    fontSize: 10,
    fontFamily: F.medium,
    marginTop: 2,
  },

  // Bottom actions
  alarmButton: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  alarmButtonText: {
    color: "#f5f5f7",
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 1.5,
  },
  completedBanner: {
    backgroundColor: "#0a1f15",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  completedText: {
    color: "#34d399",
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 1.5,
  },
});
