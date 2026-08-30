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
import { useAuth } from "@/lib/auth";
import { F, S } from "@/lib/fonts";
import AuroraBackground from "@/components/AuroraBackground";

export default function HabitTrackScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { habits, loading: habitsLoading, refresh: refreshHabits } = useHabits();
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
        <ActivityIndicator color="#8b8b93" />
      </View>
    );
  }

  // No session at all (shouldn't happen behind the welcome gate)
  if (!user && !isGuest) {
    return (
      <View style={styles.gateWrap}>
        <Text style={styles.gateTitle} maxFontSizeMultiplier={1.2}>
          Small habits, tracked daily.
        </Text>
        <Text style={styles.gateBody}>
          Add the habits that matter and tap them off each morning. A free
          account keeps your streaks safe across devices.
        </Text>
        <Pressable
          style={styles.gateButton}
          onPress={() => router.push("/auth")}
          accessibilityRole="button"
          accessibilityLabel="Create a free account"
        >
          <Text style={styles.gateButtonText}>Create a free account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground dim={0.5} />
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
                accessibilityRole="checkbox"
                accessibilityState={{ checked: complete }}
                accessibilityLabel={`${item.title}, ${count} of ${item.times_per_day} today`}
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
            {todayTotal > 0 && (
              <Pressable
                onPress={() => router.push("/profile-page" as any)}
                style={styles.todayPts}
                accessibilityRole="button"
                accessibilityLabel={`${todayTotal * 2} points earned today. See your graph`}
              >
                <Ionicons name="trending-up" size={14} color="#34C759" />
                <Text style={styles.todayPtsText}>+{todayTotal * 2} today · see your graph</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.addRow}
              onPress={() => router.push("/habit-add" as any)}
              accessibilityRole="button"
              accessibilityLabel="Add habit"
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
  todayPts: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  todayPtsText: {
    color: "#34C759",
    fontSize: S.caption,
    fontFamily: F.semibold,
  },
  gateWrap: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  gateTitle: {
    color: "#f5f5f7",
    fontSize: S.display,
    lineHeight: 42,
    fontFamily: "Lora",
    marginBottom: 14,
  },
  gateBody: {
    color: "#a1a1aa",
    fontSize: S.secondary,
    lineHeight: 23,
    fontFamily: F.regular,
    marginBottom: 28,
  },
  gateButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  gateButtonText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  container: {
    flex: 1,
    backgroundColor: "#020805",
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
    fontSize: S.body,
    fontFamily: F.regular,
  },
  habitMeta: {
    color: "#52525b",
    fontSize: S.caption,
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
    fontSize: S.body,
    fontFamily: F.regular,
  },
  emptyText: {
    color: "#52525b",
    fontSize: S.secondary,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 48,
    lineHeight: 22,
  },
});
