import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHabits, useHabitLogs } from "@/lib/useSupabase";
import { F } from "@/lib/fonts";

export default function HabitTrackScreen() {
  const router = useRouter();
  const { habits, loading: habitsLoading, refresh: refreshHabits } = useHabits();
  const { logs, loading: logsLoading, refresh: refreshLogs, logHabit, removeLog, todayCount } = useHabitLogs(31);

  useFocusEffect(
    useCallback(() => {
      refreshHabits();
      refreshLogs();
    }, [refreshHabits, refreshLogs])
  );

  const loading = habitsLoading || logsLoading;

  const handleDotPress = async (habitId: string, timesPerDay: number) => {
    const count = todayCount(habitId);
    const today = new Date().toLocaleDateString("en-CA");

    if (count < timesPerDay) {
      // Increment — log one more completion
      await logHabit(habitId);
    } else {
      // Already complete — tap again to undo last log
      const todayLogs = logs
        .filter((l) => l.habit_id === habitId && l.log_date === today)
        .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
      if (todayLogs.length > 0) {
        await removeLog(todayLogs[0].id);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#71717a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const count = todayCount(item.id);
          const complete = count >= item.times_per_day;

          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.habitTitle}>{item.title}</Text>
                {item.times_per_day > 1 && (
                  <Text style={styles.habitMeta}>
                    {count}/{item.times_per_day} today
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => handleDotPress(item.id, item.times_per_day)}
                hitSlop={12}
                style={styles.dotWrap}
              >
                <View
                  style={[
                    styles.dot,
                    complete
                      ? { backgroundColor: item.color, borderColor: item.color }
                      : { backgroundColor: "transparent", borderColor: item.color },
                  ]}
                />
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No habits yet. Tap Add below to create your first one.
          </Text>
        }
        ListFooterComponent={
          <View>
            {habits.length > 0 && <View style={styles.separator} />}
            <Pressable
              style={styles.addRow}
              onPress={() => router.push("/habit-add" as any)}
            >
              <Ionicons name="add-circle" size={22} color="#3B82F6" style={{ marginRight: 10 }} />
              <Text style={styles.addText}>Add habit</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1c1c1e",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  rowLeft: {
    flex: 1,
  },
  habitTitle: {
    color: "#f5f5f7",
    fontSize: 17,
    fontFamily: F.regular,
  },
  habitMeta: {
    color: "#52525b",
    fontSize: 13,
    fontFamily: F.regular,
    marginTop: 2,
  },
  dotWrap: {
    padding: 4,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  addText: {
    color: "#3B82F6",
    fontSize: 17,
    fontFamily: F.regular,
  },
  emptyText: {
    color: "#52525b",
    fontSize: 15,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 48,
    lineHeight: 22,
  },
});
