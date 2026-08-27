import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated as RNAnimated,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { useAlarms, useSessions } from "@/lib/useSupabase";
import { scheduleAlarm, cancelAlarm } from "@/lib/alarmScheduler";
import { artworkFor } from "@/lib/catalog";
import { consumePickedSound } from "@/lib/soundPicker";
import { Glass } from "@/components/Glass";
import { WheelColumn, HOURS, MINUTES, MERIDIEM } from "@/components/TimeWheel";
import { F, S } from "@/lib/fonts";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}
import type { Database } from "@/lib/database.types";

type Alarm = Database["public"]["Tables"]["alarms"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];
type SessionMap = Record<string, Session>;

// ─── Starter alarms (unchanged behavior) ───────────────────
const PRESETS_SEEDED_KEY = "presets_seeded_v1";

const PRESETS: Array<{ label: string; hour: number; minute: number; sessionTitle: string }> = [
  { label: "Calm & Centered Start", hour: 6, minute: 0, sessionTitle: "Calm & Centered Start" },
  { label: "High Performer Daily Activation", hour: 6, minute: 30, sessionTitle: "High Performer Daily Activation" },
  { label: "General Morning Mindset", hour: 7, minute: 0, sessionTitle: "General Morning Mindset" },
  { label: "Dawn Chorus", hour: 7, minute: 30, sessionTitle: "Dawn Chorus" },
];

function nextOccurrence(hour: number, minute: number): string {
  const fire = new Date();
  fire.setHours(hour, minute, 0, 0);
  if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);
  return fire.toISOString();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  let hour = d.getHours();
  const minute = d.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return { hour: `${hour}:${minute.toString().padStart(2, "0")}`, ampm };
}

// ─── Glass pill switch ─────────────────────────────────────
function PillSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (val: boolean) => void;
  accessibilityLabel: string;
}) {
  const anim = useRef(new RNAnimated.Value(value ? 1 : 0)).current;
  const squish = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(anim, {
      toValue: value ? 1 : 0,
      stiffness: 260,
      damping: 22,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const thumbW = squish.interpolate({ inputRange: [0, 1], outputRange: [27, 33] });
  const translateX = RNAnimated.subtract(
    anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }),
    RNAnimated.multiply(squish, anim.interpolate({ inputRange: [0, 1], outputRange: [0, 6] })),
  );
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.18)", "#34C759"],
  });

  const setSquish = (to: number) =>
    RNAnimated.spring(squish, { toValue: to, stiffness: 300, damping: 20, useNativeDriver: false }).start();

  return (
    <Pressable
      onPressIn={() => setSquish(1)}
      onPressOut={() => setSquish(0)}
      onPress={() => {
        Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium);
        onValueChange(!value);
      }}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <RNAnimated.View style={[styles.switchTrack, { backgroundColor: trackColor }]}>
        <RNAnimated.View style={[styles.switchThumb, { width: thumbW, transform: [{ translateX }] }]} />
      </RNAnimated.View>
    </Pressable>
  );
}

// ─── One alarm card (glass) ────────────────────────────────
function AlarmCard({
  item,
  session,
  onToggle,
  onOpen,
}: {
  item: Alarm;
  session?: Session;
  onToggle: (id: string, enabled: boolean) => void;
  onOpen: (item: Alarm, frame: { x: number; y: number; w: number; h: number }) => void;
}) {
  const { hour, ampm } = formatTime(item.next_fire_at);
  const soundName = session?.title || "Default";
  const duration = session ? `${Math.round(session.duration_sec / 60)} min` : "10 min";
  const wrapRef = useRef<View>(null);

  const open = () => {
    wrapRef.current?.measureInWindow((x, y, w, h) => {
      onOpen(item, { x, y, w, h });
    });
  };

  return (
    <View ref={wrapRef} collapsable={false} style={styles.cardWrap}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.label || "Alarm"}, ${hour} ${ampm}, ${soundName}, ${duration}`}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <Glass interactive style={styles.card}>
          {session && (
            <Image
              source={{ uri: artworkFor(session) }}
              style={styles.cardArt}
              resizeMode="cover"
              accessible={false}
            />
          )}
          <View style={styles.cardBody}>
            <View style={styles.timeRow}>
              <Text style={styles.time} maxFontSizeMultiplier={1.4}>{hour}</Text>
              <Text style={styles.ampm} maxFontSizeMultiplier={1.4}>{ampm}</Text>
            </View>
            <Text style={styles.sublabel} numberOfLines={1}>
              {soundName} · {duration}
            </Text>
          </View>
          <PillSwitch
            value={item.enabled}
            onValueChange={(val) => onToggle(item.id, val)}
            accessibilityLabel={`${item.label || "Alarm"} at ${hour} ${ampm}`}
          />
        </Glass>
      </Pressable>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────
export default function AlarmsScreen() {
  const { alarms, loading, toggle, refresh, remove, add, update } = useAlarms();
  const { sessions } = useSessions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const seedingRef = useRef(false);
  const healedRef = useRef(false);
  const rootRef = useRef<View>(null);
  const rootOrigin = useRef({ x: 0, y: 0 });

  // ── Morph editor state ──
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [closing, setClosing] = useState(false);
  const morph = useSharedValue(0); // 0 = card, 1 = expanded editor
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Editor form state
  const [hourIdx, setHourIdx] = useState(0);
  const [minIdx, setMinIdx] = useState(0);
  const [merIdx, setMerIdx] = useState(0);
  const [sessionId, setSessionId] = useState("");

  const sessionMap: SessionMap = {};
  for (const s of sessions) sessionMap[s.id] = s;

  // Backdrop: the first alarm's artwork — bright, luxe, color for the
  // glass to react to. Falls back to the first session in the catalog.
  const backdropSession =
    sessionMap[alarms.find((a) => a.enabled)?.mantra_id ?? alarms[0]?.mantra_id ?? ""] ??
    sessions[0];

  const openEditor = (item: Alarm, f: { x: number; y: number; w: number; h: number }) => {
    const d = new Date(item.next_fire_at);
    const h12 = d.getHours() % 12 || 12;
    setHourIdx(h12 - 1);
    setMinIdx(d.getMinutes());
    setMerIdx(d.getHours() >= 12 ? 1 : 0);
    setSessionId(item.mantra_id);
    setFrame({
      x: f.x - rootOrigin.current.x,
      y: f.y - rootOrigin.current.y,
      w: f.w,
      h: f.h,
    });
    setClosing(false);
    setEditing(item);
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    morph.value = 0;
    // Jelly: springs past 1 and settles — the card stretches into the sheet
    morph.value = withSpring(1, { damping: 14, stiffness: 130, mass: 0.9 });
  };

  const finishClose = () => {
    setEditing(null);
    setClosing(false);
  };

  const closeEditor = () => {
    setClosing(true);
    morph.value = withSpring(0, { damping: 16, stiffness: 160, mass: 0.9 }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  };

  const saveEditor = async () => {
    if (!editing) return;
    let h = hourIdx + 1;
    if (merIdx === 1 && h < 12) h += 12;
    if (merIdx === 0 && h === 12) h = 0;
    const fire = new Date();
    fire.setHours(h, minIdx, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);
    const label = sessionMap[sessionId]?.title ?? editing.label ?? "Alarm";

    await cancelAlarm(editing.id);
    const { data: updated } = await update(editing.id, {
      label,
      mantra_id: sessionId,
      next_fire_at: fire.toISOString(),
    });
    if (updated?.enabled) await scheduleAlarm(updated);
    Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
    closeEditor();
  };

  const deleteEditing = async () => {
    if (!editing) return;
    await cancelAlarm(editing.id);
    await remove(editing.id);
    closeEditor();
  };

  // Sound picked from /sounds while the editor is open; refresh list on focus
  useFocusEffect(
    useCallback(() => {
      const picked = consumePickedSound();
      if (picked) setSessionId(picked);
      refresh();
    }, [refresh])
  );

  // Heal alarms whose session left the catalog
  useEffect(() => {
    if (healedRef.current || loading || sessions.length === 0 || alarms.length === 0) return;
    const orphans = alarms.filter((a) => !sessions.some((s) => s.id === a.mantra_id));
    if (orphans.length === 0) return;
    healedRef.current = true;
    const fallback = sessions.find((s) => s.tier === "free") ?? sessions[0];
    (async () => {
      for (const o of orphans) {
        await update(o.id, { mantra_id: fallback.id, label: fallback.title });
      }
    })();
  }, [loading, alarms, sessions, update]);

  // Seed starter alarms once
  useEffect(() => {
    if (loading || alarms.length > 0 || sessions.length === 0 || seedingRef.current) return;
    seedingRef.current = true;
    (async () => {
      const seeded = await AsyncStorage.getItem(PRESETS_SEEDED_KEY);
      if (seeded) return;
      await AsyncStorage.setItem(PRESETS_SEEDED_KEY, "1");
      for (const p of PRESETS) {
        const session = sessions.find(
          (s) => s.title.toLowerCase() === p.sessionTitle.toLowerCase(),
        );
        await add({
          label: p.label,
          mantra_id: session?.id ?? sessions[0].id,
          next_fire_at: nextOccurrence(p.hour, p.minute),
          repeat_days: [],
          enabled: false,
        });
      }
    })();
  }, [loading, alarms.length, sessions, add]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    await toggle(id, enabled);
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    if (enabled) await scheduleAlarm({ ...alarm, enabled: true });
    else await cancelAlarm(id);
  }, [alarms, toggle]);

  // ── Morph animation frames ──
  const expTop = insets.top + 8;
  const expBottom = 12 + insets.bottom;

  const morphStyle = useAnimatedStyle(() => {
    const t = morph.value;
    return {
      position: "absolute" as const,
      left: interpolate(t, [0, 1], [frame.x, 12]),
      top: interpolate(t, [0, 1], [frame.y, expTop]),
      width: interpolate(t, [0, 1], [frame.w, winW - 24]),
      height: interpolate(t, [0, 1], [frame.h, winH - expTop - expBottom]),
      borderRadius: interpolate(t, [0, 1], [26, 34]),
    };
  }, [frame, winW, winH, expTop, expBottom]);

  const editorContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0.35, 1], [0, 1]),
  }));

  const editingSession = editing ? sessionMap[sessionId] : undefined;
  const editTime = editing ? formatTime(editing.next_fire_at) : null;

  return (
    <View
      ref={rootRef}
      style={styles.container}
      onLayout={() => {
        rootRef.current?.measureInWindow((x, y) => {
          rootOrigin.current = { x, y };
        });
      }}
    >
      {/* ── Luxe backdrop the glass reacts to ── */}
      {backdropSession && (
        <Image
          source={{ uri: artworkFor(backdropSession) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessible={false}
        />
      )}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="alarmscrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
              <Stop offset="30%" stopColor="#000000" stopOpacity="0.12" />
              <Stop offset="75%" stopColor="#000000" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#alarmscrim)" />
        </Svg>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : alarms.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No alarms yet. Tap + to create one.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {alarms.map((item) => (
            <AlarmCard
              key={item.id}
              item={item}
              session={sessionMap[item.mantra_id]}
              onToggle={handleToggle}
              onOpen={openEditor}
            />
          ))}
        </ScrollView>
      )}

      {/* ── The jelly editor: the tapped card, expanded ── */}
      {editing && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closing ? undefined : closeEditor}
            accessibilityLabel="Close alarm editor"
          />
          <Animated.View style={[morphStyle, styles.morphShell]}>
            <Glass style={styles.morphGlass}>
              <Animated.View style={[styles.editorContent, editorContentStyle]}>
                {/* Header row */}
                <View style={styles.editorHeader}>
                  <Pressable
                    onPress={closeEditor}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="chevron-down" size={26} color="#ffffff" />
                  </Pressable>
                  <Pressable
                    onPress={deleteEditing}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Delete alarm"
                  >
                    <Ionicons name="trash-outline" size={22} color="rgba(255,255,255,0.75)" />
                  </Pressable>
                </View>

                {/* Sound — tap to change */}
                <Pressable
                  onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
                  style={styles.editorSound}
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingSession
                      ? `Wake-up sound, ${editingSession.title}. Change sound`
                      : "Choose sound"
                  }
                >
                  {editingSession ? (
                    <Image
                      source={{ uri: artworkFor(editingSession) }}
                      style={styles.editorArt}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.editorArt, styles.editorArtEmpty]}>
                      <Ionicons name="add" size={22} color="#ffffff" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editorSoundTitle} numberOfLines={1}>
                      {editingSession?.title ?? "Choose sound"}
                    </Text>
                    {editingSession && (
                      <Text style={styles.editorSoundMeta}>
                        {editingSession.category} · {Math.round(editingSession.duration_sec / 60)} min
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
                </Pressable>

                {/* Time wheel */}
                <View
                  style={styles.wheelWrap}
                  accessible
                  accessibilityLabel={editTime ? `Alarm time ${editTime.hour} ${editTime.ampm}` : "Alarm time"}
                >
                  <View style={styles.wheelHighlight} />
                  <View style={styles.wheelColumns}>
                    <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={52} label="Hour" light />
                    <Text style={styles.wheelColon}>:</Text>
                    <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={52} label="Minute" light />
                    <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={52} label="AM or PM" light />
                  </View>
                </View>

                {/* Save */}
                <Pressable
                  onPress={saveEditor}
                  style={({ pressed }) => [styles.saveButton, pressed && { transform: [{ scale: 0.98 }] }]}
                  accessibilityRole="button"
                  accessibilityLabel="Save alarm"
                >
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </Animated.View>
            </Glass>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },

  // Cards
  cardWrap: {
    borderRadius: 26,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 26,
    overflow: "hidden",
    padding: 12,
    paddingRight: 18,
  },
  cardArt: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardBody: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  time: {
    fontSize: S.clock,
    fontFamily: F.light,
    letterSpacing: -2,
    color: "#ffffff",
  },
  ampm: {
    fontSize: S.title,
    fontFamily: F.light,
    marginLeft: 3,
    color: "#ffffff",
  },
  sublabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: S.caption,
    marginTop: 2,
    fontFamily: F.regular,
  },

  // Switch
  switchTrack: {
    width: 51,
    height: 31,
    borderRadius: 999,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Morph editor
  morphShell: {
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  morphGlass: {
    flex: 1,
    borderRadius: 34,
    overflow: "hidden",
  },
  editorContent: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  editorSound: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  editorArt: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  editorArtEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  editorSoundTitle: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  editorSoundMeta: {
    color: "rgba(255,255,255,0.65)",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 2,
  },

  // Wheel
  wheelWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelHighlight: {
    position: "absolute",
    alignSelf: "center",
    width: 210,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  wheelColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wheelColon: {
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: F.regular,
  },

  // Save
  saveButton: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
    letterSpacing: 0.3,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: S.secondary,
    textAlign: "center",
    fontFamily: F.regular,
  },
});
