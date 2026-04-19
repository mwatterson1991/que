import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Polyline, Defs, LinearGradient, Stop } from "react-native-svg";
import { useRouter } from "expo-router";
import { F } from "@/lib/fonts";
import { useColors } from "@/lib/theme";
import { useProfile, useScores, useCategories, useActivity } from "@/lib/useSupabase";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function WeekChart({ data }: { data: number[] }) {
  const c = useColors();
  const W = 320;
  const H = 100;
  const padX = 10;
  const padY = 10;

  if (data.length < 2) {
    return (
      <View style={[styles.chartCard, { height: H + 40, justifyContent: "center", alignItems: "center", backgroundColor: c.panelMid, borderColor: c.border }]}>
        <Text style={{ color: c.fgFaint, fontFamily: F.regular, fontSize: 14 }}>
          Not enough data yet
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
    <View style={[styles.chartCard, { backgroundColor: c.panelMid, borderColor: c.border }]}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.success} stopOpacity="0.25" />
            <Stop offset="1" stopColor={c.success} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polyline
          points={points}
          fill="none"
          stroke={c.success}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.dayRow}>
        {DAYS.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: c.fgDim }]}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const c = useColors();
  const { profile, loading: profileLoading } = useProfile();
  const { scores } = useScores();
  const { categories } = useCategories();
  const { activity } = useActivity();

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgDeep, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={c.fgDim} />
      </View>
    );
  }

  const currentScore = profile?.score ?? 0;
  const dayStreak = profile?.day_streak ?? 0;
  const sessionsCompleted = profile?.sessions_completed ?? 0;
  const totalHours = profile?.total_hours ?? 0;

  const chartData = scores.slice(-7).map((s) => s.score);

  const strengths = [...categories]
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    .slice(0, 3)
    .map((c) => c.name);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bgDeep }]} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: c.fgDim }]}>YOUR QUE SCORE</Text>
        <Pressable onPress={() => router.push("/settings" as any)}>
          <Ionicons name="settings-outline" size={24} color={c.fgDim} />
        </Pressable>
      </View>

      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreValue, { color: c.fg }]}>{currentScore}</Text>
        {scores.length > 1 && (
          <Text style={[styles.scoreDelta, { color: c.success }]}>
            ↑+{Math.max(0, currentScore - (scores[scores.length - 2]?.score ?? 0))} today
          </Text>
        )}
      </View>

      <WeekChart data={chartData} />

      {/* Stats row */}
      <View style={[styles.statsRow, { borderColor: c.border }]}>
        <View style={[styles.statBox, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border }]}>
          <Text style={[styles.statValue, { color: c.fg }]}>{dayStreak}</Text>
          <Text style={[styles.statLabel, { color: c.fgDim }]}>DAY STREAK</Text>
        </View>
        <View style={[styles.statBox, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.border }]}>
          <Text style={[styles.statValue, { color: c.fg }]}>{sessionsCompleted}</Text>
          <Text style={[styles.statLabel, { color: c.fgDim }]}>SESSIONS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: c.fg }]}>{Number(totalHours).toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: c.fgDim }]}>HOURS</Text>
        </View>
      </View>

      <View style={[styles.sectionSep, { backgroundColor: c.border }]} />

      {/* Strong In */}
      <Text style={[styles.sectionTitle, { color: c.fgDim }]}>STRONG IN</Text>
      <View style={styles.pillRow}>
        {strengths.length > 0 ? (
          strengths.map((s) => (
            <View key={s} style={[styles.pill, { borderColor: c.borderMid }]}>
              <Text style={[styles.pillText, { color: c.fg }]}>{s}</Text>
            </View>
          ))
        ) : (
          <Text style={{ color: c.fgFaint, fontFamily: F.regular, fontSize: 14 }}>
            Complete sessions to build strengths
          </Text>
        )}
      </View>

      <View style={[styles.sectionSep, { backgroundColor: c.border }]} />

      {/* Recent Activity */}
      <Text style={[styles.sectionTitle, { color: c.fgDim }]}>RECENT ACTIVITY</Text>
      {activity.length > 0 ? (
        activity.slice(0, 10).map((item) => (
          <View key={item.id} style={[styles.activityRow, { borderBottomColor: c.borderFaint }]}>
            <Text style={[styles.activityTitle, { color: c.fg }]}>{item.title}</Text>
            <Text style={[styles.activityDate, { color: c.fgDim }]}>{formatDate(item.completed_at!)}</Text>
          </View>
        ))
      ) : (
        <Text style={{ color: c.fgFaint, fontFamily: F.regular, fontSize: 14, paddingVertical: 12 }}>
          No activity yet
        </Text>
      )}

      {/* Share button */}
      <Pressable style={[styles.shareButton, { borderColor: c.borderMid }]}>
        <Text style={[styles.shareText, { color: c.fg }]}>SHARE PROGRESS</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 1.5,
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 72,
    fontFamily: F.bold,
    letterSpacing: -3,
  },
  scoreDelta: {
    fontSize: 16,
    fontFamily: F.medium,
    fontStyle: "italic",
  },

  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
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
    fontSize: 13,
    fontFamily: F.medium,
  },

  statsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontFamily: F.bold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: F.semibold,
    letterSpacing: 1,
    marginTop: 4,
  },

  sectionSep: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: F.semibold,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  pillRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 15,
    fontFamily: F.regular,
  },

  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: F.medium,
    flex: 1,
  },
  activityDate: {
    fontSize: 14,
    marginLeft: 12,
    fontFamily: F.regular,
  },

  shareButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  shareText: {
    fontSize: 15,
    fontFamily: F.bold,
    letterSpacing: 1.5,
  },
});
