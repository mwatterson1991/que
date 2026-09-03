import { useCallback } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useHabits, useHabitLogs } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { Screen, Empty, Button, IconButton, Divider } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import HabitCell from "@/components/HabitCell";

export default function HabitTrackScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { habits, loading: habitsLoading, refresh: refreshHabits, archive } = useHabits();
  const { logs, loading: logsLoading, refresh: refreshLogs, logHabit, removeLog, todayCount } = useHabitLogs(31);

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
      refreshLogs();
    }, [refreshHabits, refreshLogs])
  );

  const loading = habitsLoading || logsLoading;
  const todayStr = new Date().toLocaleDateString("en-CA");
  const todayTotal = logs.filter((l) => l.log_date === todayStr).length;

  // Consecutive days (ending today or yesterday) with at least one log
  const streakFor = (habitId: string): number => {
    const days = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.log_date));
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
    const count = todayCount(habitId);
    const today = new Date().toLocaleDateString("en-CA");

    if (count < timesPerDay) {
      await logHabit(habitId);
    } else {
      const todayLogs = logs
        .filter((l) => l.habit_id === habitId && l.log_date === today)
        .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
      if (todayLogs.length > 0) {
        await removeLog(todayLogs[0].id);
      }
    }
  };

  const addHabit = () => router.push("/habit-add" as any);

  const header = (
    <Stack.Screen
      options={{
        title: "Habits",
        headerRight: () => <IconButton icon="add" label="Add habit" onPress={addHabit} />,
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

  return (
    <Screen>
      {header}
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <HabitCell
            title={item.title}
            color={item.color}
            timesPerDay={item.times_per_day}
            count={todayCount(item.id)}
            streak={streakFor(item.id)}
            onToggle={() => toggleHabit(item.id, item.times_per_day)}
            onRemove={() => confirmArchive(item.id, item.title)}
          />
        )}
        ItemSeparatorComponent={() => <Divider inset={SP.screen + SP.xxxl + SP.md} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Empty title="No habits yet" body="Add your first one — one small thing you want to do every morning." />
            <Button title="Add a habit" icon="add" onPress={addHabit} accessibilityLabel="Add habit" />
          </View>
        }
        ListFooterComponent={
          todayTotal > 0 ? (
            <Button
              tone="plain"
              icon="trending-up"
              title={`+${todayTotal * 2} today · see your graph`}
              onPress={() => router.push("/profile-page" as any)}
              accessibilityLabel={`${todayTotal * 2} points earned today. See your graph`}
              style={styles.footer}
            />
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
  empty: {
    paddingTop: SP.xxxl,
    paddingHorizontal: SP.screen,
    gap: SP.xl,
  },
  footer: {
    marginTop: SP.md,
  },
});
