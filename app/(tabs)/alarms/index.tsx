import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { TAB_BAR_INSET } from "@/lib/nav";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { Divider, Empty, Screen, Toggle, Txt } from "@/components/ui";
import { feel } from "@/lib/feel";
import { C, R, SP, TYPE } from "@/lib/tokens";
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
        <Txt kind="body">Delete</Txt>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── One alarm row ─────────────────────────────────────────
// The Clock app's row, with a small poster of the sound in front of it:
//
//   [art]  6:30 AM
//          Calm & Centered · 7 min                                (o)
//
// Geometry, so every row is the same height and nothing drifts: the text
// column is a fixed block of exactly ART_H points, made of the time line
// (a box exactly TYPE.clockRow.lineHeight tall, digits and AM/PM sharing
// one baseline), a TEXT_GAP, and one line of description at
// TYPE.subheadline.lineHeight. The thumbnail is a square of the same
// ART_H, so its top sits on the top of the digit line box and its bottom
// on the bottom of the description line box. Row order is thumbnail,
// text column, switch, all centred on the row's vertical axis, with
// identical SP.md padding above and below. Separators run full bleed.
// The description never wraps, and the two text lines are pinned to a
// font size multiplier of 1 so Dynamic Type cannot break the square.
const TEXT_GAP = SP.xs;
/** Image edge: top of the digit line box to the bottom of the description. */
const ART_H = TYPE.clockRow.lineHeight + TEXT_GAP + TYPE.subheadline.lineHeight;
const ART_GAP = SP.lg;
/** OFF alarms keep the photo but dim it, the way Clock greys its digits. */
const ART_OFF_OPACITY = 0.45;

function AlarmRow({
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
  const tone = item.enabled ? "primary" : "secondary";
  const bodyTone = item.enabled ? "secondary" : "tertiary";

  return (
    <ReanimatedSwipeable
      containerStyle={styles.rowWrap}
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
        onPress={() => {
          feel.tap();
          onOpen(item);
        }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.label || "Alarm"}, ${hour} ${ampm}, ${soundName}, ${duration}`}
        accessibilityHint="Swipe left to delete"
      >
        {/* A plain photo, no tone or scrim, so the poster reads at full strength.
            A blank tile while the session loads, so the time never jumps. */}
        {session ? (
          <Image
            source={{ uri: artworkFor(session) }}
            style={[styles.art, !item.enabled && styles.artOff]}
            resizeMode="cover"
            accessible={false}
          />
        ) : (
          <View style={styles.art} />
        )}
        <View style={styles.body}>
          {/* maxFontSizeMultiplier is pinned to 1 on both lines: the photo is
              sized to the sum of the two line boxes, and a Dynamic Type bump
              would push the text out of the square it is meant to match. */}
          <View style={styles.time}>
            <Txt kind="clockRow" tone={tone} numberOfLines={1} maxFontSizeMultiplier={1}>
              {hour}
            </Txt>
            <Txt kind="body" tone="secondary" numberOfLines={1} maxFontSizeMultiplier={1}>
              {ampm}
            </Txt>
          </View>
          <Txt
            kind="subheadline"
            tone={bodyTone}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1}
            style={styles.description}
          >
            {soundName} · {duration}
          </Txt>
        </View>
        <Toggle
          value={item.enabled}
          onValueChange={(val) => onToggle(item.id, val)}
          accessibilityLabel={`${item.label || "Alarm"} at ${hour} ${ampm}`}
        />
      </Pressable>
    </ReanimatedSwipeable>
  );
}

// ─── Screen ────────────────────────────────────────────────
export default function AlarmsScreen() {
  const { alarms, loading, refresh, add, update, remove } = useAlarms();
  const { sessions } = useSessions();
  const router = useRouter();
  const seedingRef = useRef(false);
  const healedRef = useRef(false);
  const syncedRef = useRef(false);

  const sessionMap: SessionMap = {};
  for (const s of sessions) sessionMap[s.id] = s;

  const openAlarm = (item: Alarm) => {
    router.push(`/alarm-config?id=${item.id}` as any);
  };

  // Swipe reveals Delete; the Alert is the actual commit point, because a
  // stray swipe should never silently drop someone's wake-up.
  const confirmDelete = useCallback((item: Alarm) => {
    feel.warn();
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

  // Enabling always schedules at a FUTURE time, because a stale next_fire_at
  // used to be scheduled as-is and silently dropped by the OS guard.
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    if (enabled) {
      const next_fire_at = rollForward(alarm);
      const { data: updated } = await update(id, { enabled: true, next_fire_at });
      const armed = await scheduleAlarm(updated ?? { ...alarm, enabled: true, next_fire_at });
      // Never let a switch look on when nothing is armed behind it.
      if (!armed) {
        await update(id, { enabled: false });
        Alert.alert(
          "Alarm not armed",
          "The phone refused to set this alarm. Open Settings, then Alarm Diagnostics, to see why.",
        );
      }
    } else {
      await update(id, { enabled: false });
      await cancelAlarm(id);
    }
  }, [alarms, update]);

  return (
    <Screen>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.labelSecondary} />
        </View>
      ) : alarms.length === 0 ? (
        <Empty title="No Alarms" body="Tap + to add one." />
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_INSET }]}
          showsVerticalScrollIndicator={false}
        >
          {alarms.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <Divider inset={0} />}
              <AlarmRow
                item={item}
                session={sessionMap[item.mantra_id]}
                onToggle={handleToggle}
                onOpen={openAlarm}
                onDelete={confirmDelete}
              />
            </View>
          ))}
          <Divider inset={0} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: SP.xxxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Rows
  rowWrap: {
    backgroundColor: C.bg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: ART_GAP,
    paddingHorizontal: SP.screen,
    paddingVertical: SP.md,
    backgroundColor: C.bg,
  },
  rowPressed: {
    backgroundColor: C.fill,
  },
  art: {
    width: ART_H,
    height: ART_H,
    borderRadius: R.md,
    borderCurve: "continuous",
    backgroundColor: C.fill,
    opacity: 1,
  },
  artOff: {
    opacity: ART_OFF_OPACITY,
  },
  // Exactly ART_H tall: time line box + gap + one description line box.
  body: {
    flex: 1,
    height: ART_H,
    gap: TEXT_GAP,
  },
  time: {
    height: TYPE.clockRow.lineHeight,
    flexDirection: "row",
    alignItems: "baseline",
    gap: SP.xs,
  },
  description: {
    height: TYPE.subheadline.lineHeight,
  },

  // Swipe-to-delete
  deleteAction: {
    width: DELETE_W,
    justifyContent: "center",
  },
  deleteHit: {
    flex: 1,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
  },
});
