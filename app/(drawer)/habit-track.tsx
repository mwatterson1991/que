import { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHabits, useHabitLogs } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { F, S } from "@/lib/fonts";
import AuroraBackground from "@/components/AuroraBackground";
import HabitCell from "@/components/HabitCell";

export default function HabitTrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // The whole cell is the target now, so this is what a tap on a habit means:
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
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
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
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={34} color="#6b6b73" />
            <Text style={styles.emptyText}>
              No habits yet. Add your first one below — one small thing you want
              to do every morning.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View>
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

            {/* WHY a filled pill and not glass: this button sits over the
                aurora with nothing behind it, and the old blue-on-glow row was
                unreadable. A solid near-white pill with near-black text is the
                app's existing primary-action shape (see the guest gate above)
                and can't be washed out by a bright patch of the backdrop. */}
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              onPress={() => router.push("/habit-add" as any)}
              accessibilityRole="button"
              accessibilityLabel="Add habit"
            >
              <Ionicons name="add" size={20} color="#0a0a0a" />
              <Text style={styles.addButtonText}>Add habit</Text>
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
    paddingVertical: 16,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  gap: {
    height: 10, // glass cells need air between them or they read as one slab
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 8,
  },
  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  addButtonText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  empty: {
    alignItems: "center",
    gap: 14,
    marginTop: 56,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: "#c8c8d0",
    fontSize: S.secondary,
    fontFamily: F.regular,
    textAlign: "center",
    lineHeight: 22,
  },
});
