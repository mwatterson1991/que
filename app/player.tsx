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
  Image,
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
import { F, S } from "@/lib/fonts";
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
import { artworkFor, isHypnotherapy } from "@/lib/catalog";
import { usePremium, isLocked } from "@/lib/premium";
import { Glass } from "@/components/Glass";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

const { width: SCREEN_W } = Dimensions.get("window");
const ORB_RADIUS = 38;
const ORB_SIZE = ORB_RADIUS * 2 + 24;
const SWING_RANGE = SCREEN_W / 2 - ORB_SIZE / 2 - 20;
// The dock is a glass card inset from the screen edge, so the scrub math has
// to use the card's real inner width or the thumbless bar lands off by 8pt.
const DOCK_MARGIN = 12;
const DOCK_PAD = 16;
const TRACK_PAD = DOCK_MARGIN + DOCK_PAD;
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
      router.push("/edit-alarm" as any);
    }
  };

  const displayElapsed = scrubbing ? Math.floor(scrubPos * duration) : elapsed;
  const progress = duration > 0 ? displayElapsed / duration : 0;
  const mantras = session?.mantras ?? [];
  // Hypnotherapy keeps the orb + mantra teleprompter; everything else
  // (naturescapes, frequencies, …) shows its artwork instead.
  const showOrb = session ? isHypnotherapy(session) : true;

  return (
    <View style={styles.container}>
      {/* Artwork is the hero: it fills the whole screen so the glass dock
          floats ON the photo rather than sitting on a black shelf below it. */}
      {!showOrb && session && (
        <Image
          source={{ uri: artworkFor(session) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={`${session.title} artwork`}
        />
      )}
      {!showOrb && (
        // Legibility scrim — glass is CLEAR, so anything over a photo needs a
        // gradient underneath it, not just a heavier font.
        <View style={styles.artScrim} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="gArt" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <Stop offset="45%" stopColor="#000000" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#gArt)" />
          </Svg>
        </View>
      )}

      {showOrb ? (
        <>
          {/* Nav bar */}
          <View style={[styles.navBar, { paddingTop: insets.top }]}>
            <Pressable
              style={styles.navIconBtn}
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color="#f5f5f7" />
            </Pressable>
            {!completed && (
              <Pressable
                style={styles.selectPill}
                onPress={handleSetAsAlarm}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={isPickMode ? "Use for this alarm" : "Set as alarm"}
              >
                <Ionicons name="checkmark" size={16} color="#0a0a0a" />
                <Text style={styles.selectPillText}>
                  {isPickMode ? "Use" : "Set as alarm"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Particle orb */}
          <HypnoticOrb playing={playing} />

          {/* Teleprompter mantras */}
          <MantraTeleprompter mantras={mantras} activeMantra={activeMantra} />
        </>
      ) : (
        // Spacer that holds the floating chrome; the photo behind it is
        // already full-bleed, so this View draws nothing itself.
        <View style={styles.artworkArea}>
          {/* Back button — glass over ARTWORK is fine; glass over glass is not */}
          <Pressable
            style={[styles.artworkBack, { top: insets.top + 6 }]}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Glass interactive scrim="soft" style={styles.artworkBackGlass}>
              <Ionicons name="chevron-back" size={26} color="#f5f5f7" />
            </Glass>
          </Pressable>
          {!completed && (
            <Pressable
              style={[styles.selectPill, styles.selectPillOverArt, { top: insets.top + 8 }]}
              onPress={handleSetAsAlarm}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isPickMode ? "Use for this alarm" : "Set as alarm"}
            >
              <Ionicons name="checkmark" size={16} color="#0a0a0a" />
              <Text style={styles.selectPillText}>
                {isPickMode ? "Use" : "Set as alarm"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Transport dock — ONE glass layer, holding metadata + scrubber + controls */}
      <View style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom + 10, 22) }]}>
        {/* "strong" — the dock carries small type (timestamps, skip labels)
            and in artwork mode it sits directly on the photo. */}
        <Glass scrim="strong" style={styles.dock}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {session?.title ?? "Loading..."}
            </Text>
            <Pressable
              style={styles.menuButton}
              hitSlop={12}
              onPress={() => Alert.alert(session?.title ?? "", session?.description ?? "")}
              accessibilityRole="button"
              accessibilityLabel="Session details"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
          <Text style={styles.narrator} numberOfLines={1}>{session?.narrator}</Text>

          {/* Progress bar — no thumb */}
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
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText} maxFontSizeMultiplier={1.4}>{formatTime(displayElapsed)}</Text>
              <Text style={styles.timeText} maxFontSizeMultiplier={1.4}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Transport — solid white play button so it reads on clear glass */}
          <View style={styles.transport}>
            <Pressable
              style={styles.skipBtn}
              onPress={() => skip(-15)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back 15 seconds"
            >
              <Ionicons name="play-back" size={22} color="#f5f5f7" />
              <Text style={styles.skipLabel} maxFontSizeMultiplier={1.2}>15</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.playBtn, pressed && { transform: [{ scale: 0.94 }] }]}
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause session" : "Play session"}
            >
              <Ionicons
                name={playing ? "pause" : "play"}
                size={30}
                color="#0a0a0a"
                style={!playing ? { marginLeft: 3 } : undefined}
              />
            </Pressable>

            <Pressable
              style={styles.skipBtn}
              onPress={() => skip(15)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Forward 15 seconds"
            >
              <Ionicons name="play-forward" size={22} color="#f5f5f7" />
              <Text style={styles.skipLabel} maxFontSizeMultiplier={1.2}>15</Text>
            </Pressable>
          </View>

          {completed && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#34d399" style={{ marginRight: 8 }} />
              <Text style={styles.completedText}>SESSION COMPLETE</Text>
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
    backgroundColor: "#000000",
  },

  // Nav
  selectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: "auto",
    marginRight: 16,
  },
  selectPillOverArt: {
    position: "absolute",
    right: 12,
    marginRight: 0,
  },
  selectPillText: {
    color: "#0a0a0a",
    fontSize: S.caption,
    fontFamily: F.semibold,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingBottom: 8,
    gap: 4,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Artwork mode (non-hypnotherapy sessions)
  artworkArea: {
    flex: 1,
    position: "relative",
  },
  // Covers the lower two-thirds of the photo so the dock's text always
  // lands on something dark, whatever the artwork is doing underneath.
  artScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "66%",
  },
  artworkBack: {
    position: "absolute",
    left: 12,
    width: 42,
    height: 42,
  },
  artworkBackGlass: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    overflow: "hidden",
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
    fontSize: S.title,
    lineHeight: 34,
    fontFamily: F.regular,
    paddingHorizontal: 24,
  },
  mantraActive: {
    color: "#f5f5f7",
  },
  mantraDim: {
    color: "#3a3a3d",
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

  // Transport dock
  dockWrap: {
    paddingHorizontal: DOCK_MARGIN,
  },
  dock: {
    borderRadius: 28,
    overflow: "hidden",
    padding: DOCK_PAD,
    paddingTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  sessionTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: F.bold,
    // Belt-and-braces over a bright photo — the scrim does most of the work
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  menuButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  narrator: {
    color: "rgba(255,255,255,0.72)",
    fontSize: S.secondary,
    fontFamily: F.medium,
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
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
    backgroundColor: "rgba(255,255,255,0.22)",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: S.micro,
    fontFamily: F.medium,
  },

  // Controls
  transport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 34,
    marginTop: 4,
    marginBottom: 4,
  },
  skipBtn: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  skipLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: S.micro,
    fontFamily: F.semibold,
    marginTop: 2,
  },

  // Bottom actions
  completedBanner: {
    backgroundColor: "rgba(10,31,21,0.85)",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  completedText: {
    color: "#34d399",
    fontSize: S.secondary,
    fontFamily: F.bold,
    letterSpacing: 1.5,
  },
});
