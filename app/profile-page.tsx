import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Svg,
  Polyline,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from "react-native-svg";
import { useRouter, useNavigation } from "expo-router";
import { F } from "@/lib/fonts";

// ─── Chart data by time range ────────────────────────────
const CHART_RANGES: Record<string, { data: number[]; labels: string[] }> = {
  "1W": {
    data: [42, 44, 40, 48, 52, 50, 56],
    labels: ["M", "T", "W", "T", "F", "S", "S"],
  },
  "1M": {
    data: [30, 28, 34, 32, 38, 36, 40, 42, 38, 44, 42, 48, 50, 46, 52, 50, 48, 54, 56, 52, 58, 55, 53, 57, 60, 58, 62, 56, 54, 56],
    labels: ["Week 1", "", "Week 2", "", "Week 3", "", "Week 4"],
  },
  "3M": {
    data: [18, 20, 22, 24, 22, 26, 28, 30, 32, 28, 34, 38, 36, 40, 42, 44, 48, 46, 50, 52, 48, 54, 56],
    labels: ["Jan", "", "Feb", "", "Mar", ""],
  },
  "6M": {
    data: [10, 14, 12, 18, 16, 20, 22, 26, 24, 28, 30, 26, 32, 36, 34, 38, 40, 42, 44, 48, 46, 50, 52, 48, 54, 56],
    labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
  },
  "1Y": {
    data: [5, 8, 6, 10, 12, 14, 16, 14, 18, 20, 22, 18, 24, 26, 22, 28, 30, 32, 28, 34, 36, 38, 40, 42, 44, 48, 46, 50, 52, 48, 54, 56],
    labels: ["Apr", "", "Jun", "", "Aug", "", "Oct", "", "Dec", "", "Feb", "", "Apr"],
  },
  All: {
    data: [2, 4, 3, 6, 5, 8, 10, 8, 12, 14, 10, 16, 18, 14, 20, 22, 24, 20, 26, 28, 30, 32, 28, 34, 36, 38, 40, 42, 44, 48, 46, 50, 52, 48, 54, 56],
    labels: ["2024", "", "", "", "", "2025", "", "", "", "", "2026"],
  },
};

const TIME_RANGES = ["1W", "1M", "3M", "6M", "1Y", "All"];

// ─── Placeholder data ────────────────────────────────────
const SCORE = 847;
const SCORE_DELTA = 12;
const STATS = [
  { value: "32", label: "DAY STREAK" },
  { value: "89", label: "SESSIONS" },
  { value: "14", label: "HABITS" },
];
const CATEGORIES = [
  { name: "Sleep", sessions: 28, minutes: 412, progress: 82, color: "#22c55e" },
  { name: "Confidence", sessions: 22, minutes: 286, progress: 65, color: "#22c55e" },
  { name: "Addiction", sessions: 18, minutes: 198, progress: 48, color: "#22c55e" },
  { name: "Anxiety", sessions: 12, minutes: 156, progress: 35, color: "#22c55e" },
  { name: "Gratitude", sessions: 15, minutes: 120, progress: 30, color: "#22c55e" },
  { name: "Mindfulness", sessions: 9, minutes: 90, progress: 22, color: "#22c55e" },
];
const RECENT = [
  { title: "Morning Confidence Ritual", date: "Today" },
  { title: "Deep Sleep Induction", date: "Yesterday" },
  { title: "Stop Scrolling", date: "Apr 9" },
  { title: "Gratitude Flood", date: "Apr 8" },
];

// ─── Chart component ─────────────────────────────────────
function ScoreChart() {
  const [range, setRange] = useState("1M");
  const { data, labels } = CHART_RANGES[range];

  const W = 340;
  const H = 180;
  const padX = 10;
  const padTop = 16;
  const padBottom = 30;
  const chartH = H - padTop - padBottom;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const dataRange = max - min || 1;

  // Build points for the polyline
  const pts = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (W - padX * 2);
    const y = padTop + (1 - (v - min) / dataRange) * chartH;
    return { x, y };
  });
  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");

  // Polygon for gradient fill (line + bottom edge)
  const fillPoints =
    linePoints +
    ` ${pts[pts.length - 1].x},${padTop + chartH} ${pts[0].x},${padTop + chartH}`;

  // Grid lines (4 horizontal)
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(
    (pct) => padTop + chartH * (1 - pct)
  );

  // Grid vertical lines
  const vLineCount = Math.min(labels.length, 7);
  const vLines = Array.from({ length: vLineCount }, (_, i) =>
    padX + (i / (vLineCount - 1)) * (W - padX * 2)
  );

  return (
    <View style={styles.chartCard}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22c55e" stopOpacity="0.3" />
            <Stop offset="0.7" stopColor="#22c55e" stopOpacity="0.05" />
            <Stop offset="1" stopColor="#22c55e" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {gridLines.map((y, i) => (
          <Line
            key={`h${i}`}
            x1={padX}
            y1={y}
            x2={W - padX}
            y2={y}
            stroke="#1c1c1e"
            strokeWidth="1"
          />
        ))}

        {/* Vertical grid lines */}
        {vLines.map((x, i) => (
          <Line
            key={`v${i}`}
            x1={x}
            y1={padTop}
            x2={x}
            y2={padTop + chartH}
            stroke="#1c1c1e"
            strokeWidth="1"
          />
        ))}

        {/* Gradient fill */}
        <Polygon points={fillPoints} fill="url(#chartGrad)" />

        {/* Line */}
        <Polyline
          points={linePoints}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>

      {/* X-axis labels */}
      <View style={styles.labelRow}>
        {labels
          .filter((l) => l !== "")
          .map((l, i) => (
            <Text key={i} style={styles.labelText}>
              {l}
            </Text>
          ))}
      </View>

      {/* Time range pills */}
      <View style={styles.rangePills}>
        {TIME_RANGES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.rangePill, r === range && styles.rangePillActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: r === range }}
            accessibilityLabel={r}
          >
            <Text
              style={[
                styles.rangePillText,
                r === range && styles.rangePillTextActive,
              ]}
            >
              {r}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={{ marginLeft: 4 }} accessibilityRole="button" accessibilityLabel="Back to chat">
          <Ionicons name="chatbubble-outline" size={22} color="#f5f5f7" />
        </Pressable>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginRight: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Share profile">
            <Ionicons name="share-outline" size={22} color="#f5f5f7" />
          </Pressable>
          <Pressable onPress={() => router.push("/settings" as any)} accessibilityRole="button" accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={22} color="#f5f5f7" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router]);

  return (
    <View style={styles.container}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      bounces={true}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreValue} maxFontSizeMultiplier={1.2}>{SCORE}</Text>
        <Text style={styles.scoreDelta}>+{SCORE_DELTA}</Text>
      </View>

      {/* Chart */}
      <ScoreChart />

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((s, i) => (
          <View key={i} style={styles.statItem}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Separator */}
      <View style={styles.sectionSep} />

      {/* Categories */}
      <Text style={styles.sectionTitle} accessibilityRole="header">CATEGORIES</Text>
      {CATEGORIES.map((cat, i) => (
        <View key={i} style={styles.catRow}>
          <View style={styles.catHeader}>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catMeta}>{cat.sessions} sessions · {cat.minutes} min</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${cat.progress}%`, backgroundColor: cat.color }]} />
          </View>
        </View>
      ))}

      {/* Separator */}
      <View style={styles.sectionSep} />

      {/* Recent Activity */}
      <Text style={styles.sectionTitle} accessibilityRole="header">RECENT ACTIVITY</Text>
      {RECENT.map((item, i) => (
        <View key={i} style={styles.activityRow}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activityDate}>{item.date}</Text>
        </View>
      ))}

      {/* Share button */}
      <Pressable style={styles.shareButton} accessibilityRole="button">
        <Text style={styles.shareText}>SHARE PROGRESS</Text>
      </Pressable>
    </ScrollView>
    </View>
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
    paddingBottom: 80,
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
    fontSize: 50,
    fontFamily: F.light,
    letterSpacing: -2,
  },
  scoreDelta: {
    color: "#22c55e",
    fontSize: 18,
    fontFamily: F.medium,
  },

  // Chart
  chartCard: {
    backgroundColor: "#0d0d0f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    paddingTop: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  labelText: {
    color: "#52525b",
    fontSize: 11,
    fontFamily: F.medium,
  },
  rangePills: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rangePillActive: {
    backgroundColor: "#1c1c1e",
  },
  rangePillText: {
    color: "#52525b",
    fontSize: 13,
    fontFamily: F.semibold,
  },
  rangePillTextActive: {
    color: "#f5f5f7",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 32,
    paddingVertical: 16,
    marginBottom: 4,
  },
  statItem: {
    alignItems: "flex-start",
  },
  statValue: {
    color: "#f5f5f7",
    fontSize: 28,
    fontFamily: F.light,
  },
  statLabel: {
    color: "#71717a",
    fontSize: 11,
    fontFamily: F.semibold,
    letterSpacing: 1,
    marginTop: 2,
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

  // Categories
  catRow: {
    marginBottom: 18,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  catName: {
    color: "#f5f5f7",
    fontSize: 16,
    fontFamily: F.medium,
  },
  catMeta: {
    color: "#52525b",
    fontSize: 13,
    fontFamily: F.regular,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#1c1c1e",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
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
