import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlarms, useSessions } from "@/lib/useSupabase";
import { scheduleAlarm, cancelAlarm } from "@/lib/alarmScheduler";
import { F, S } from "@/lib/fonts";
import type { Database } from "@/lib/database.types";

type Alarm = Database["public"]["Tables"]["alarms"]["Row"];

// ─── Starter alarms ────────────────────────────────────────
// Seeded once when the alarms list is empty so the home screen is
// never blank. All OFF by default — nothing rings until chosen.
const PRESETS_SEEDED_KEY = "presets_seeded_v1";

const PRESETS: Array<{ label: string; hour: number; minute: number; sessionTitle: string }> = [
  { label: "Deep Morning Reset", hour: 6, minute: 0, sessionTitle: "Circadian Reset" },
  { label: "Focus Start", hour: 6, minute: 30, sessionTitle: "Improve Focus" },
  { label: "Confidence Ritual", hour: 7, minute: 0, sessionTitle: "Morning Confidence Ritual" },
  { label: "Gratitude Wake", hour: 7, minute: 30, sessionTitle: "Gratitude Flood" },
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
  const minStr = minute.toString().padStart(2, "0");
  return { hour: `${hour}:${minStr}`, ampm };
}

type SessionMap = Record<string, Database["public"]["Tables"]["sessions"]["Row"]>;

// Apple-style pill switch: 51×31 track, 27pt thumb that slides across.
// The switch alone carries on/off state — row text stays white.
function PillSwitch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (val: boolean) => void;
  accessibilityLabel: string;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#39393d", "#34C759"],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.switchThumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function AlarmRow({ item, onToggle, sessionMap }: { item: Alarm; onToggle: (id: string, enabled: boolean) => void; sessionMap: SessionMap }) {
  const { hour, ampm } = formatTime(item.next_fire_at);
  const color = "#f5f5f7";
  const dimColor = "#71717a";
  const router = useRouter();
  const session = sessionMap[item.mantra_id];
  const soundName = session?.title || "Default";
  const duration = session ? `${Math.round(session.duration_sec / 60)} min` : "10 min";

  const alarmLabel = `${item.label || "Alarm"}, ${hour} ${ampm}, ${soundName}, ${duration}`;

  return (
    <Pressable
      onPress={() => router.push(`/edit-alarm?id=${item.id}` as any)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${alarmLabel}`}
    >
      <View style={styles.rowLeft}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color }]} maxFontSizeMultiplier={1.4}>{hour}</Text>
          <Text style={[styles.ampm, { color }]} maxFontSizeMultiplier={1.4}>{ampm}</Text>
        </View>
        <Text style={[styles.label, { color: dimColor }]}>
          {item.label || "Alarm"}
        </Text>
        <Text style={[styles.sublabel, { color: dimColor }]}>
          {soundName} · {duration}
        </Text>
      </View>
      <PillSwitch
        value={item.enabled}
        onValueChange={(val) => onToggle(item.id, val)}
        accessibilityLabel={`${item.label || "Alarm"} at ${hour} ${ampm}`}
      />
    </Pressable>
  );
}

export default function AlarmsScreen() {
  const { alarms, loading, toggle, refresh, remove, add } = useAlarms();
  const { sessions } = useSessions();
  const router = useRouter();
  const seedingRef = useRef(false);

  // Re-fetch every time this screen comes into focus so new/edited alarms appear
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Seed starter alarms once so the home screen is never empty
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

  // Toggle: cancel or reschedule the OS notification to match enabled state
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    await toggle(id, enabled);
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    if (enabled) {
      await scheduleAlarm({ ...alarm, enabled: true });
    } else {
      await cancelAlarm(id);
    }
  }, [alarms, toggle]);

  // Delete: cancel OS notification then remove from DB
  const handleDelete = useCallback(async (id: string) => {
    await cancelAlarm(id);
    await remove(id);
  }, [remove]);

  const sessionMap: SessionMap = {};
  for (const s of sessions) sessionMap[s.id] = s;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.separator} />

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#71717a" />
          </View>
        ) : alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No alarms yet. Use the chat or tap + to create one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={alarms}
            keyExtractor={(a) => a.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <AlarmRow item={item} onToggle={handleToggle} sessionMap={sessionMap} />
            )}
            ListFooterComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchTrack: {
    width: 51,
    height: 31,
    borderRadius: 999,
    justifyContent: "center",
  },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#38383a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowLeft: {
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
  },
  ampm: {
    fontSize: S.title,
    fontFamily: F.light,
    marginLeft: 2,
  },
  label: {
    color: "#71717a",
    fontSize: S.secondary,
    marginTop: -2,
    fontFamily: F.regular,
  },
  sublabel: {
    color: "#71717a",
    fontSize: S.caption,
    marginTop: 2,
    fontFamily: F.regular,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#52525b",
    fontSize: S.secondary,
    textAlign: "center",
    fontFamily: F.regular,
  },
});
