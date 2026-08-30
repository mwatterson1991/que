import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated as RNAnimated,
  Image,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlarms, useSessions } from "@/lib/useSupabase";
import { rollForward, scheduleAlarm, cancelAlarm, syncAlarms } from "@/lib/alarmScheduler";
import { artworkFor } from "@/lib/catalog";
import { Glass } from "@/components/Glass";
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
  onOpen: (item: Alarm) => void;
}) {
  const { hour, ampm } = formatTime(item.next_fire_at);
  const soundName = session?.title || "Default";
  const duration = session ? `${Math.round(session.duration_sec / 60)} min` : "10 min";

  return (
    <View style={styles.cardWrap}>
      <Pressable
        onPress={() => onOpen(item)}
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
  const { alarms, loading, refresh, add, update } = useAlarms();
  const { sessions } = useSessions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerPad = insets.top + 52; // floating glass header
  const seedingRef = useRef(false);
  const healedRef = useRef(false);
  const syncedRef = useRef(false);

  const sessionMap: SessionMap = {};
  for (const s of sessions) sessionMap[s.id] = s;

  // One glass layer only: tapping a card travels to the alarm's own page.
  const openAlarm = (item: Alarm) => {
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    router.push(`/alarm-config?id=${item.id}` as any);
  };

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // ── OS-queue sync: the "alarm never fires" fix ──
  // Once per app session, after alarms load: heal stale fire times and
  // make the notification queue match the list exactly.
  useEffect(() => {
    if (loading || syncedRef.current || alarms.length === 0) return;
    syncedRef.current = true;
    syncAlarms(alarms, async (id, next_fire_at) => update(id, { next_fire_at }));
  }, [loading, alarms, update]);

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

  // Enabling always schedules at a FUTURE time — a stale next_fire_at
  // used to be scheduled as-is and silently dropped by the OS guard.
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    if (enabled) {
      const next_fire_at = rollForward(alarm);
      const { data: updated } = await update(id, { enabled: true, next_fire_at });
      await scheduleAlarm(updated ?? { ...alarm, enabled: true, next_fire_at });
    } else {
      await update(id, { enabled: false });
      await cancelAlarm(id);
    }
  }, [alarms, update]);

  return (
    <View style={styles.container}>
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
          contentContainerStyle={[styles.list, { paddingTop: headerPad + 8 }]}
          showsVerticalScrollIndicator={false}
        >
          {alarms.map((item) => (
            <AlarmCard
              key={item.id}
              item={item}
              session={sessionMap[item.mantra_id]}
              onToggle={handleToggle}
              onOpen={openAlarm}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  list: {
    paddingHorizontal: 12,
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
