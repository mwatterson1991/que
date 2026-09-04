import { useCallback, useRef, useState } from "react";
import { TAB_BAR_INSET } from "@/lib/nav";
import { View, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useHabits, useHabitLogs } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { Screen, Empty, Button, IconButton, Txt } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import HabitCell from "@/components/HabitCell";

const POINTS_PER_LOG = 2;

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

  const confirmArchive = (habitId: string, title: string) => {
    Alert.alert("Remove habit?", `"${title}" and its history will be hidden from tracking.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await archive(habitId); refreshHabits(); } },
    ]);
  };

  // The whole cell is the target, so this is what a tap on a habit means:
  // add one completion, or — once the day's quota is met — undo the last one.
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
          <HabitCell
            title={item.title}
            timesPerDay={item.times_per_day}
            count={countFor(item.id)}
            streak={streakFor(item.id)}
            onToggle={() => toggleHabit(item.id, item.times_per_day)}
            onRemove={() => confirmArchive(item.id, item.title)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Empty title="No habits yet" body="Add your first one — one small thing you want to do every morning." />
            <Button title="Add a habit" icon="plus" onPress={addHabit} accessibilityLabel="Add habit" />
          </View>
        }
        ListFooterComponent={
          habits.length > 0 ? (
            <View style={styles.footer}>
              {/* The score is information; the graph is an action. They used
                  to share one green link, so they read as the same thing. */}
              {points > 0 && (
                <Txt kind="subheadline" tone="secondary" style={styles.points}>
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
    paddingHorizontal: SP.screen,
    paddingTop: SP.sm,
    paddingBottom: SP.xxxl,
  },
  gap: {
    height: SP.sm,
  },
  empty: {
    paddingTop: SP.xxxl,
    gap: SP.xl,
  },
  footer: {
    marginTop: SP.xxl,
    gap: SP.md,
  },
  points: {
    textAlign: "center",
  },
});
