import { useCallback, useEffect, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, Image, Alert } from "react-native";
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlarms, useSessions, useHabits } from "@/lib/useSupabase";
import { rollForward, scheduleAlarm, cancelAlarm } from "@/lib/alarmScheduler";
import { artworkFor } from "@/lib/catalog";
import { consumePickedSound } from "@/lib/soundPicker";
import { WheelColumn, WheelHighlight, HOURS, MINUTES, MERIDIEM } from "@/components/TimeWheel";
import { Row, Screen, Section, Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// Setting an alarm is the moment habits make sense — you've just decided what
// tomorrow morning looks like. But it's a nudge, not a nag: it appears only for
// someone with zero habits, and only ever once.
const HABIT_PROMPT_KEY = "habit_prompt_shown_v1";

const COL_W = 64;
const COLON_W = 16;
// Three columns, the colon, and the gaps between them.
const WHEEL_W = COL_W * 3 + COLON_W + SP.sm * 3;

const BAR_ICON = 24;
const TICK = 28;

/**
 * X / check in the bar instead of Cancel / Save: two glyphs weigh the same
 * as the title, and each sits in a plain 44pt square at the bar's own
 * 16pt margin with no padding of its own.
 */
function BarIcon({
  icon,
  label,
  onPress,
}: {
  icon: "x" | "check";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.barIcon, pressed && { opacity: PRESS_OPACITY }]}
    >
      <Feather name={icon} size={BAR_ICON} color={C.accent} />
    </Pressable>
  );
}

// The alarm sheet: the time wheel on top, then one grouped list — Sound,
// and Delete when editing. Save lives in the bar.
export default function AlarmConfigScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { alarms, add, update, remove } = useAlarms();
  const { sessions } = useSessions();
  const { habits, loading: habitsLoading } = useHabits();

  const existing = alarms.find((a) => a.id === id);
  const isNew = !existing;
  const title = isNew ? "New Alarm" : "Alarm";

  const [hourIdx, setHourIdx] = useState(5); // 6 o'clock
  const [minIdx, setMinIdx] = useState(30);
  const [merIdx, setMerIdx] = useState(0); // AM
  const [sessionId, setSessionId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate form once from the alarm (or defaults for a new one)
  useEffect(() => {
    if (hydrated) return;
    if (existing) {
      const d = new Date(existing.next_fire_at);
      const h12 = d.getHours() % 12 || 12;
      setHourIdx(h12 - 1);
      setMinIdx(d.getMinutes());
      setMerIdx(d.getHours() >= 12 ? 1 : 0);
      setSessionId(existing.mantra_id);
      setHydrated(true);
    } else if (id === undefined && sessions.length > 0) {
      setSessionId((sessions.find((s) => s.tier === "free") ?? sessions[0]).id);
      setHydrated(true);
    }
  }, [existing, hydrated, id, sessions]);

  // Sound picked from /sounds on the way back
  useFocusEffect(
    useCallback(() => {
      const picked = consumePickedSound();
      if (picked) setSessionId(picked);
    }, [])
  );

  const session = sessions.find((s) => s.id === sessionId);

  const save = async () => {
    let h = hourIdx + 1;
    if (merIdx === 1 && h < 12) h += 12;
    if (merIdx === 0 && h === 12) h = 0;
    const fire = new Date();
    fire.setHours(h, minIdx, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);
    const label = session?.title ?? existing?.label ?? "Alarm";

    if (existing) {
      await cancelAlarm(existing.id);
      const { data: updated } = await update(existing.id, {
        label,
        mantra_id: sessionId,
        next_fire_at: fire.toISOString(),
      });
      if (updated?.enabled) {
        await scheduleAlarm({ ...updated, next_fire_at: rollForward(updated) });
      }
    } else {
      await add({
        label,
        mantra_id: sessionId,
        next_fire_at: fire.toISOString(),
        repeat_days: [],
        enabled: false,
      });
    }
    Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
    await leaveAfterSave();
  };

  // Leaving the screen after a save — with one optional detour.
  const leaveAfterSave = async () => {
    // Anyone already tracking habits knows the loop; don't explain it again.
    // While habits are still loading we can't tell, so we stay silent.
    if (habitsLoading || habits.length > 0) { router.back(); return; }
    if (await AsyncStorage.getItem(HABIT_PROMPT_KEY)) { router.back(); return; }
    // Written before showing, so a force-quit mid-prompt still burns the one shot.
    await AsyncStorage.setItem(HABIT_PROMPT_KEY, "1");

    Alert.alert(
      "Alarm set",
      "Add a habit to track each morning. Every one you complete raises your positivity score.",
      [
        { text: "Not now", style: "cancel", onPress: () => router.back() },
        // Pushed, not replaced: backing out of habit-add returns you to the
        // alarm you just made, then to the list.
        { text: "Track a habit", onPress: () => router.push("/habit-add" as any) },
      ],
    );
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert("Delete alarm?", existing.label ?? "This alarm", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelAlarm(existing.id);
          await remove(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title,
          // Drawn with Txt so the title takes a real text style (title3,
          // semibold) rather than the bar's inline default.
          headerTitle: () => <Txt kind="title3" numberOfLines={1}>{title}</Txt>,
          headerLeft: () => <BarIcon icon="x" label="Cancel" onPress={() => router.back()} />,
          headerRight: () => <BarIcon icon="check" label="Save" onPress={save} />,
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        {/* Time wheel */}
        <View style={styles.wheelWrap} accessible accessibilityLabel="Alarm time">
          <WheelHighlight width={WHEEL_W} />
          <View style={styles.wheelColumns}>
            <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={COL_W} label="Hour" />
            <Txt kind="picker" style={styles.colon}>:</Txt>
            <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={COL_W} label="Minute" />
            <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={COL_W} label="AM or PM" />
          </View>
        </View>

        {/* Sound — the row names it, the poster below wears the tick */}
        <Section>
          <Row
            title="Sound"
            value={session?.title ?? "Choose"}
            onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
            accessibilityLabel={session ? `Sound, ${session.title}. Change sound` : "Choose sound"}
          />
        </Section>
        {session && (
          <Pressable
            onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
            style={({ pressed }) => [styles.artWrap, pressed && { opacity: PRESS_OPACITY }]}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            accessibilityLabel={`Selected sound: ${session.title}, ${session.category}, ${Math.round(session.duration_sec / 60)} minutes. Change sound`}
          >
            <Image source={{ uri: artworkFor(session) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.artCaption}>
              <View style={styles.artCaptionText}>
                <Txt kind="headline" numberOfLines={1}>{session.title}</Txt>
                <Txt kind="footnote" tone="secondary" numberOfLines={1}>
                  {session.category} · {Math.round(session.duration_sec / 60)} min
                </Txt>
              </View>
              {/* The selection tick: a filled accent disc, the one the Sounds browser uses. */}
              <View style={styles.tick}>
                <Feather name="check" size={TICK - SP.sm} color={C.onAccent} />
              </View>
            </View>
          </Pressable>
        )}

        {!isNew && (
          <Section>
            <Row title="Delete Alarm" destructive accessory="none" onPress={confirmDelete} style={styles.centerRow} />
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  barIcon: {
    width: SP.hit,
    height: SP.hit,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SP.lg,
  },
  wheelColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
  },
  colon: {
    width: COLON_W,
    textAlign: "center",
    marginBottom: 2,
  },
  artWrap: {
    marginHorizontal: SP.screen,
    marginTop: SP.md,
    height: 200,
    borderRadius: R.xl,
    overflow: "hidden",
    backgroundColor: C.fill,
  },
  artCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    padding: SP.lg,
    backgroundColor: C.scrim,
  },
  artCaptionText: {
    flex: 1,
  },
  tick: {
    width: TICK,
    height: TICK,
    borderRadius: R.pill,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  centerRow: {
    justifyContent: "center",
  },
});
