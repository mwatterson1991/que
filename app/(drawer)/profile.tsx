import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Polyline, Defs, LinearGradient, Stop } from "react-native-svg";
import { useRouter } from "expo-router";
import { F } from "@/lib/fonts";
import EmptyState from "@/lib/EmptyState";
import { useProfile, useScores, useCategories, useActivity } from "@/lib/useSupabase";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// ─── Mini sparkline chart ─────────────────────────────────
function WeekChart({ data }: { data: number[] }) {
  const W = 320;
  const H = 100;
  const padX = 10;
  const padY = 10;

  if (data.length < 2) {
    return (
      <View style={[styles.chartCard, { height: H + 40, justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="stats-chart-outline" size={28} color="#3f3f46" style={{ marginBottom: 8 }} />
        <Text style={{ color: "#52525b", fontFamily: F.regular, fontSize: 14 }}>
          Complete a few sessions to see your trend
        </Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (W - padX * 2);
    const y = padY + (1 - (v - min) / range) * (H - padY * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <View style={styles.chartCard}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22c55e" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polyline
          points={points}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.dayRow}>
        {DAYS.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const { scores } = useScores();
  const { categories } = useCategories();
  const { activity } = useActivity();

  if (profileLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#71717a" />
      </View>
    );
  }

  const currentScore = profile?.score ?? 0;
  const dayStreak = profile?.day_streak ?? 0;
  const sessionsCompleted = profile?.sessions_completed ?? 0;
  const totalHours = profile?.total_hours ?? 0;

  // Chart data from scores table
  const chartData = scores.slice(-7).map((s) => s.score);

  // Top 3 categories by progress
  const strengths = [...categories]
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 3)
    .map((c) => c.name);

  // Format activity dates
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>YOUR QUE SCORE</Text>
        <Pressable onPress={() => router.push("/settings" as any)}>
          <Ionicons name="settings-outline" size={24} color="#71717a" />
        </Pressable>
      </View>

      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreValue}>{currentScore}</Text>
        {scores.length > 1 && (
          <Text style={styles.scoreDelta}>
            ↑+{Math.max(0, currentScore - (scores[scores.length - 2]?.score ?? 0))} today
          </Text>
        )}
      </View>

      {/* Chart */}
      <WeekChart data={chartData} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, styles.statBorder]}>
          <Text style={styles.statValue}>{dayStreak}</Text>
          <Text style={styles.statLabel}>DAY STREAK</Text>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <Text style={styles.statValue}>{sessionsCompleted}</Text>
          <Text style={styles.statLabel}>SESSIONS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Number(totalHours).toFixed(0)}</Text>
          <Text style={styles.statLabel}>HOURS</Text>
        </View>
      </View>

      {/* Separator */}
      <View style={styles.sectionSep} />

      {/* Strong In */}
      <Text style={styles.sectionTitle}>STRONG IN</Text>
      <View style={styles.pillRow}>
        {strengths.length > 0 ? (
          strengths.map((s) => (
            <View key={s} style={styles.pill}>
              <Text style={styles.pillText}>{s}</Text>
            </View>
          ))
        ) : (
          <View style={styles.inlineEmpty}>
            <Ionicons name="sparkles-outline" size={18} color="#3f3f46" style={{ marginRight: 8 }} />
            <Text style={styles.inlineEmptyText}>
              Complete sessions to build strengths
            </Text>
          </View>
        )}
      </View>

      {/* Separator */}
      <View style={styles.sectionSep} />

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
      {activity.length > 0 ? (
        activity.slice(0, 10).map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityDate}>{formatDate(item.completed_at!)}</Text>
          </View>
        ))
      ) : (
        <EmptyState
          icon="time-outline"
          title="No activity yet"
          subtitle="Your completed sessions will show up here."
        />
      )}

      {/* Share button */}
      <Pressable style={styles.shareButton}>
        <Text style={styles.shareText}>SHARE PROGRESS</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerLabel: {
    color: "#71717a",
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 1.5,
  },

  // Score
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 20,
  },
  scoreValue: {
    color: "#f5f5f7",
    fontSize: 72,
    fontFamily: F.bold,
    letterSpacing: -3,
  },
  scoreDelta: {
    color: "#22c55e",
    fontSize: 16,
    fontFamily: F.medium,
    fontStyle: "italic",
  },

  // Chart
  chartCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    paddingTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 8,
  },
  dayLabel: {
    color: "#71717a",
    fontSize: 13,
    fontFamily: F.medium,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#27272a",
    paddingVertical: 16,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#27272a",
  },
  statValue: {
    color: "#f5f5f7",
    fontSize: 28,
    fontFamily: F.bold,
  },
  statLabel: {
    color: "#71717a",
    fontSize: 11,
    fontFamily: F.semibold,
    letterSpacing: 1,
    marginTop: 4,
  },

  // Sections
  sectionSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#27272a",
    marginVertical: 20,
  },
  sectionTitle: {
    color: "#71717a",
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Strength pills
  pillRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    color: "#f5f5f7",
    fontSize: 15,
    fontFamily: F.regular,
  },

  // Activity list
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  activityTitle: {
    color: "#f5f5f7",
    fontSize: 16,
    fontFamily: F.medium,
    flex: 1,
  },
  activityDate: {
    color: "#71717a",
    fontSize: 14,
    marginLeft: 12,
    fontFamily: F.regular,
  },

  // Inline empty state (used inside sections like "Strong In")
  inlineEmpty: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  inlineEmptyText: {
    color: "#52525b",
    fontFamily: F.regular,
    fontSize: 14,
  },

  // Share button
  shareButton: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  shareText: {
    color: "#f5f5f7",
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 1.5,
  },
});
