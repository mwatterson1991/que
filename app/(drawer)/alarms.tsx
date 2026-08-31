import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Image,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// The Reanimated Swipeable, not the legacy one: gesture-handler 2.31 ships the
// old `Swipeable` as deprecated (it drives RN Animated), and this app is
// already on Reanimated 4, so the reanimated variant is the one that
// type-checks and shares the same UI-thread driver as the rest of the screen.
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
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
  { label: "First Light", hour: 7, minute: 30, sessionTitle: "First Light" },
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

// ─── Swipe-left delete action ──────────────────────────────
// Its own component so the animated style lives in a real render, not
// inside the renderRightActions callback.
const DELETE_W = 92;

function DeleteAction({
  drag,
  label,
  onPress,
}: {
  drag: SharedValue<number>;
  label: string;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + DELETE_W }],
  }));

  return (
    <Reanimated.View style={[styles.deleteAction, style]}>
      <Pressable
        onPress={onPress}
        style={styles.deleteHit}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${label}`}
      >
        <Text style={styles.deleteText} maxFontSizeMultiplier={1.3}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── One alarm card (glass) ────────────────────────────────
function AlarmCard({
  item,
  session,
  onToggle,
  onOpen,
  onDelete,
}: {
  item: Alarm;
  session?: Session;
  onToggle: (id: string, enabled: boolean) => void;
  onOpen: (item: Alarm) => void;
  onDelete: (item: Alarm) => void;
}) {
  const { hour, ampm } = formatTime(item.next_fire_at);
  const soundName = session?.title || "Default";
  const duration = session ? `${Math.round(session.duration_sec / 60)} min` : "10 min";

  // Spring, not opacity — the card should feel like a physical object being
  // pushed into the glass, and settle back rather than snap.
  const scale = useRef(new RNAnimated.Value(1)).current;
  const springTo = (to: number) =>
    RNAnimated.spring(scale, {
      toValue: to,
      stiffness: 420,
      damping: 24,
      mass: 0.7,
      useNativeDriver: true,
    }).start();

  return (
    <ReanimatedSwipeable
      containerStyle={styles.cardWrap}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      renderRightActions={(_progress, drag, methods: SwipeableMethods) => (
        <DeleteAction
          drag={drag}
          label={item.label || "alarm"}
          onPress={() => {
            methods.close();
            onDelete(item);
          }}
        />
      )}
    >
      <Pressable
        onPressIn={() => {
          Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
          springTo(0.955);
        }}
        onPressOut={() => springTo(1)}
        onPress={() => onOpen(item)}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.label || "Alarm"}, ${hour} ${ampm}, ${soundName}, ${duration}`}
        accessibilityHint="Swipe left to delete"
      >
        <RNAnimated.View style={{ transform: [{ scale }] }}>
          {/* "soft" — mostly large clock type; the caption line leans on
              its own text shadow rather than a heavier veil. */}
          <Glass interactive scrim="soft" style={styles.card}>
            {session && (
              <Image
                source={{ uri: artworkFor(session) }}
                style={styles.cardArt}
                resizeMode="cover"
                accessible={false}
              />
            )}
            {/* Text sits on CLEAR glass over a MOVING aurora, so weight alone
                isn't enough — every string here carries its own soft shadow
                (see styles.time / .ampm / .sublabel) as a per-glyph scrim. */}
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
        </RNAnimated.View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

// ─── Screen ────────────────────────────────────────────────
export default function AlarmsScreen() {
  const { alarms, loading, refresh, add, update, remove } = useAlarms();
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
  // The light impact now fires on pressIn (inside AlarmCard) so the buzz
  // lands with the squish rather than after it.
  const openAlarm = (item: Alarm) => {
    router.push(`/alarm-config?id=${item.id}` as any);
  };

  // Swipe reveals Delete; the Alert is the actual commit point, because a
  // stray swipe should never silently drop someone's wake-up.
  const confirmDelete = useCallback((item: Alarm) => {
    Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Warning);
    Alert.alert("Delete alarm?", item.label || "This alarm", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Pull it out of the OS notification queue before the row goes,
          // or the alarm keeps firing for a card that no longer exists.
          await cancelAlarm(item.id);
          await remove(item.id);
        },
      },
    ]);
  }, [remove]);

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
              onDelete={confirmDelete}
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
    // Clips the red action to the card's own corners as it slides in
    overflow: "hidden",
  },

  // Swipe-to-delete
  deleteAction: {
    width: DELETE_W,
    justifyContent: "center",
  },
  deleteHit: {
    flex: 1,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#ffffff",
    fontSize: S.secondary,
    fontFamily: F.semibold,
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
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  ampm: {
    fontSize: S.title,
    fontFamily: F.medium,
    marginLeft: 3,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  sublabel: {
    color: "rgba(255,255,255,0.86)",
    fontSize: S.caption,
    marginTop: 2,
    fontFamily: F.medium,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
