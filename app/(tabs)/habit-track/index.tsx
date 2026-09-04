import { useCallback, useRef, useState } from "react";
import { TAB_BAR_INSET } from "@/lib/nav";
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
// The Reanimated Swipeable, the same one the alarms list uses: it shares the
// Reanimated driver with the check control's dip.
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useHabits, useHabitLogs } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { clearReminder } from "@/lib/habitReminders";
import { Screen, Empty, Button, Divider, IconButton, Txt } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import HabitCell, { HABIT_SEPARATOR_INSET } from "@/components/HabitCell";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

const POINTS_PER_LOG = 2;

// Swipe-left delete action.
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

export default function HabitTrackScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { habits, loading: habitsLoading, refresh: refreshHabits, archive } = useHabits();
  const { logs, loading: logsLoading, refresh: refreshLogs, logHabit, removeLog, todayCount } = useHabitLogs(31);

  // The store only updates once the network round-trip is back, which is the
  // lag the founder felt. So the screen keeps its own answer for any habit
  // with a write in flight: the count flips on the tap itself, and the
  // override is dropped once the last in-flight write for that habit lands
  // and the store agrees.
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const inFlight = useRef<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
      refreshLogs();
    }, [refreshHabits, refreshLogs])
  );

  const loading = habitsLoading || logsLoading;
  const todayStr = new Date().toLocaleDateString("en-CA");

  const countFor = (habitId: string) => optimistic[habitId] ?? todayCount(habitId);

  const todayTotal = habits.reduce((sum, h) => sum + countFor(h.id), 0);

  // Consecutive days (ending today or yesterday) with at least one log
  const streakFor = (habitId: string): number => {
    const days = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.log_date));
    if (countFor(habitId) > 0) days.add(todayStr);
    else days.delete(todayStr);
    let streak = 0;
    const d = new Date();
    if (!days.has(d.toLocaleDateString("en-CA"))) d.setDate(d.getDate() - 1); // today not done yet
    while (days.has(d.toLocaleDateString("en-CA"))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  // Swipe reveals Delete; the Alert is the actual commit point, because a
  // stray swipe should never silently drop a streak.
  const confirmDelete = (habitId: string, title: string) => {
    Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Warning);
    Alert.alert("Delete habit?", `"${title}" and its history will be hidden from tracking.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Its reminders live on the phone, so they go with it.
          await clearReminder(habitId);
          await archive(habitId);
          refreshHabits();
        },
      },
    ]);
  };

  // What a tap on the check means: add one completion, or, once the day's
  // quota is met, undo the last one.
  const toggleHabit = async (habitId: string, timesPerDay: number) => {
    const count = countFor(habitId);
    const adding = count < timesPerDay;

    // 1. Flip now.
    setOptimistic((o) => ({ ...o, [habitId]: adding ? count + 1 : Math.max(0, count - 1) }));
    inFlight.current[habitId] = (inFlight.current[habitId] ?? 0) + 1;

    // 2. Persist behind it.
    try {
      if (adding) {
        await logHabit(habitId);
      } else {
        const todayLogs = logs
          .filter((l) => l.habit_id === habitId && l.log_date === todayStr)
          .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
        if (todayLogs.length > 0) await removeLog(todayLogs[0].id);
      }
    } finally {
      inFlight.current[habitId] = (inFlight.current[habitId] ?? 1) - 1;
      if (inFlight.current[habitId] <= 0) {
        delete inFlight.current[habitId];
        setOptimistic((o) => {
          const next = { ...o };
          delete next[habitId];
          return next;
        });
      }
    }
  };

  const addHabit = () => router.push("/habit-add" as any);
  const editHabit = (habitId: string) => router.push(`/habit-add?id=${habitId}` as any);
  const seeGraph = () => router.push("/profile-page?from=habits" as any);

  const header = (
    <Stack.Screen
      options={{
        title: "Habits",
        headerRight: () => <IconButton icon="plus" label="Add habit" onPress={addHabit} />,
      }}
    />
  );

  if (loading) {
    return (
      <Screen style={styles.centered}>
        {header}
        <ActivityIndicator color={C.labelSecondary} />
      </Screen>
    );
  }

  // No session at all (shouldn't happen behind the welcome gate)
  if (!user && !isGuest) {
    return (
      <Screen>
        {header}
        <View style={styles.gate}>
          <Empty
            title="Small habits, tracked daily."
            body="Add the habits that matter and tap them off each morning. A free account keeps your streaks safe across devices."
          />
          <Button
            title="Create a free account"
            onPress={() => router.push("/auth")}
            accessibilityLabel="Create a free account"
          />
        </View>
      </Screen>
    );
  }

  const points = todayTotal * POINTS_PER_LOG;

  return (
    <Screen>
      {header}
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_INSET }]}
        renderItem={({ item }) => (
          <ReanimatedSwipeable
            containerStyle={styles.rowWrap}
            friction={2}
            rightThreshold={40}
            overshootRight={false}
            enableTrackpadTwoFingerGesture
            renderRightActions={(_progress, drag, methods: SwipeableMethods) => (
              <DeleteAction
                drag={drag}
                label={item.title}
                onPress={() => {
                  methods.close();
                  confirmDelete(item.id, item.title);
                }}
              />
            )}
          >
            <HabitCell
              title={item.title}
              color={item.color}
              timesPerDay={item.times_per_day}
              count={countFor(item.id)}
              streak={streakFor(item.id)}
              onToggle={() => toggleHabit(item.id, item.times_per_day)}
              onEdit={() => editHabit(item.id)}
            />
          </ReanimatedSwipeable>
        )}
        ItemSeparatorComponent={() => <Divider inset={HABIT_SEPARATOR_INSET} />}
        ListFooterComponentStyle={habits.length > 0 ? styles.footerWrap : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Empty title="No habits yet" body="Add your first one. One small thing you want to do every morning." />
            <Button title="Add a habit" icon="plus" onPress={addHabit} accessibilityLabel="Add habit" />
          </View>
        }
        ListFooterComponent={
          habits.length > 0 ? (
            <View style={styles.footer}>
              {/* The score is information; the graph is an action. They used
                  to share one green link, so they read as the same thing. */}
              {points > 0 && (
                <Txt kind="headline" style={styles.points}>
                  +{points} points today
                </Txt>
              )}
              <Button
                tone="gray"
                title="See your graph"
                onPress={seeGraph}
                accessibilityLabel="See your graph"
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  gate: {
    flex: 1,
    paddingHorizontal: SP.screen,
    paddingBottom: SP.xl,
  },
  list: {
    paddingBottom: SP.xxxl,
  },
  rowWrap: {
    backgroundColor: C.bg,
  },
  empty: {
    paddingTop: SP.xxxl,
    paddingHorizontal: SP.screen,
    gap: SP.xl,
  },
  // The last row's separator, then the score and the graph button.
  footerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
  },
  footer: {
    paddingHorizontal: SP.screen,
    gap: SP.md,
  },
  // Points earned are good news, so they are green, like the switch.
  points: {
    textAlign: "center",
    marginTop: SP.lg,
    color: C.switchOn,
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
