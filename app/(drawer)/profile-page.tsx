import { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Svg,
  Polyline,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
} from "react-native-svg";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { F, S } from "@/lib/fonts";
import AuroraBackground from "@/components/AuroraBackground";
import { Glass } from "@/components/Glass";
import { buildPositivitySeries } from "@/lib/positivity";
import { useHabits, useHabitLogs, useProfile, useActivity, useGratitudeEntries } from "@/lib/useSupabase";

// Native screenshot module — lands with the next dev build; guarded so
// the current binary shares text until then.
let ViewShot: any = null;
try { ViewShot = require("react-native-view-shot"); } catch {}

// ─── Positivity chart ────────────────────────────────────
// A stock ticker on yourself, with weather. The baseline sits mid-
// chart: gratitude and habits push the line up, missed days pull it
// below zero. Built from the same data guests have on-device.
function PositivityChart({ chartRef }: { chartRef: any }) {
  const { entries } = useGratitudeEntries();
  const { logs } = useHabitLogs(31);
  const { width } = useWindowDimensions();
  const W = width - 40;
  const H = 180;
  const padX = 8;
  const padY = 18;

  const series = useMemo(
    () =>
      buildPositivitySeries(
        entries.map((e) => e.entry_date),
        logs.map((l) => l.log_date),
        31,
      ),
    [entries, logs],
  );

  const { points, total, weekDelta, todayPts } = series;
  // Symmetric range so zero is always the visual midline
  const amp = Math.max(...points.map(Math.abs), 10);

  const toXY = (v: number, i: number) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2);
    const y = padY + (1 - (v + amp) / (2 * amp)) * (H - padY * 2);
    return { x, y };
  };
  const poly = points.map((v, i) => { const { x, y } = toXY(v, i); return `${x},${y}`; }).join(" ");
  const zeroY = toXY(0, 0).y;
  const up = weekDelta >= 0;

  return (
    <Glass
      style={styles.posCard}
      accessible
      accessibilityLabel={`Positivity score ${total}, ${up ? "up" : "down"} ${Math.abs(weekDelta)} this week, last 30 days`}
    >
      <View ref={chartRef} collapsable={false} style={styles.posInner}>
      <View style={styles.posHeader}>
        <View>
          <Text style={styles.posLabel} maxFontSizeMultiplier={1.3}>POSITIVITY</Text>
          <Text style={styles.posTotal} maxFontSizeMultiplier={1.2}>{total}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={styles.posGain}>
            <Ionicons name={up ? "trending-up" : "trending-down"} size={14} color={up ? "#34C759" : "#ff6b6b"} />
            <Text style={[styles.posGainText, !up && { color: "#ff6b6b" }]} maxFontSizeMultiplier={1.3}>
              {up ? "+" : ""}{weekDelta} this week
            </Text>
          </View>
          {todayPts > 0 && (
            <Text style={styles.posToday} maxFontSizeMultiplier={1.3}>+{todayPts} today</Text>
          )}
        </View>
      </View>
      <Svg width={W - 32} height={H} viewBox={`0 0 ${W - 32} ${H}`}>
        <Defs>
          <LinearGradient id="posLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#34C759" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#34C759" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Baseline — the line you're above or below */}
        <Line
          x1={padX} y1={zeroY} x2={W - 32 - padX} y2={zeroY}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <Polyline
          points={poly}
          fill="none"
          stroke="url(#posLine)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.posFooter} maxFontSizeMultiplier={1.3}>
        Last 30 days · above the line you're building, below it you're drifting
      </Text>
      </View>
    </Glass>
  );
}

const TIME_RANGES = ["1W", "1M", "3M", "6M", "1Y"];
const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 31, "3M": 91, "6M": 182, "1Y": 365 };

// ─── Habit chart ─────────────────────────────────────────
function HabitChart() {
  const { width: screenW } = useWindowDimensions();
  const [range, setRange] = useState("1M");
  const [hiddenHabits, setHiddenHabits] = useState<Set<string>>(new Set());

  const days = RANGE_DAYS[range];
  const { habits } = useHabits();
  const { logs } = useHabitLogs(days);

  // Build date array for the range
  const dates = useMemo(() => {
    const arr: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toLocaleDateString("en-CA"));
    }
    return arr;
  }, [days]);

  // For each habit, build cumulative completions × factor over dates
  const series = useMemo(() =>
    habits.map((habit) => {
      let cumulative = 0;
      const points = dates.map((date) => {
        const count = logs.filter(
          (l) => l.habit_id === habit.id && l.log_date === date
        ).length;
        cumulative += count * habit.factor;
        return cumulative;
      });
      return { habit, points };
    }),
    [habits, logs, dates]
  );

  const W = screenW - 40;
  const H = 180;
  const padX = 4;
  const padTop = 12;
  const padBottom = 24;
  const chartH = H - padTop - padBottom;

  const allValues = series.flatMap((s) => s.points);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 1) : 1;

  const getX = (i: number) => padX + (i / Math.max(dates.length - 1, 1)) * (W - padX * 2);
  const getY = (v: number) => padTop + (1 - v / maxVal) * chartH;

  // X-axis label positions
  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(dates.length / 5));
    return dates
      .map((d, i) => ({ i, label: d.slice(5).replace("-", "/") }))
      .filter((_, i) => i % step === 0 || i === dates.length - 1);
  }, [dates]);

  const gridLines = [0.25, 0.5, 0.75, 1.0].map((p) => padTop + chartH * (1 - p));

  const toggleHabit = (id: string) => {
    setHiddenHabits((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.chartCard}>
      {/* Time range pills */}
      <View style={styles.rangePills}>
        {TIME_RANGES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.rangePill, r === range && styles.rangePillActive]}
            accessibilityRole="button"
            accessibilityLabel={`Show ${r} range`}
            accessibilityState={{ selected: r === range }}
          >
            <Text
              style={[styles.rangePillText, r === range && styles.rangePillTextActive]}
              maxFontSizeMultiplier={1.4}
            >
              {r}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* SVG chart */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="glowGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#00ff88" stopOpacity="0.06" />
            <Stop offset="0.3" stopColor="#00ff88" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#00ff88" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Green glow band near baseline */}
        <Line x1={padX} y1={getY(0)} x2={W - padX} y2={getY(0)} stroke="#00ff8822" strokeWidth="12" />

        {/* Horizontal grid */}
        {gridLines.map((y, i) => (
          <Line key={i} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#1c1c1e" strokeWidth="1" />
        ))}

        {/* One polyline per habit */}
        {series.map(({ habit, points }) => {
          if (hiddenHabits.has(habit.id)) return null;
          const linePoints = points
            .map((v, i) => `${getX(i)},${getY(v)}`)
            .join(" ");
          return (
            <Polyline
              key={habit.id}
              points={linePoints}
              fill="none"
              stroke={habit.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Endpoint dots */}
        {series.map(({ habit, points }) => {
          if (hiddenHabits.has(habit.id) || points.length === 0) return null;
          const last = points[points.length - 1];
          return (
            <Circle
              key={`dot-${habit.id}`}
              cx={getX(points.length - 1)}
              cy={getY(last)}
              r="3"
              fill={habit.color}
            />
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ i, label }) => (
          <Line key={`vg${i}`} x1={getX(i)} y1={padTop} x2={getX(i)} y2={padTop + chartH} stroke="#1c1c1e" strokeWidth="1" />
        ))}
      </Svg>

      {/* X label row */}
      <View style={[styles.labelRow, { width: W }]}>
        {xLabels.map(({ i, label }) => (
          <Text key={i} style={styles.labelText}>{label}</Text>
        ))}
      </View>

      {/* Legend */}
      {habits.length > 0 && (
        <View style={styles.legend}>
          {habits.map((habit) => {
            const hidden = hiddenHabits.has(habit.id);
            return (
              <Pressable
                key={habit.id}
                onPress={() => toggleHabit(habit.id)}
                style={styles.legendItem}
                accessibilityRole="button"
                accessibilityLabel={`${hidden ? "Show" : "Hide"} ${habit.title} on chart`}
                accessibilityState={{ selected: !hidden }}
              >
                <View style={[styles.legendDot, { backgroundColor: hidden ? "#27272a" : habit.color }]} />
                <Text style={[styles.legendLabel, hidden && { color: "#3f3f46" }]}>
                  {habit.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {habits.length === 0 && (
        <Text style={styles.chartEmpty}>Add habits to see your progress here.</Text>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromDrawer = from === "drawer";

  const chartRef = useRef(null);
  const { activity } = useActivity();

  // Share your positivity graph like a stock ticker on yourself.
  // With the view-shot module (next build) this attaches the actual
  // chart as an image; until then it falls back to text + link.
  const handleShare = async () => {
    try {
      if (ViewShot?.captureRef && chartRef.current) {
        const uri = await ViewShot.captureRef(chartRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        await Share.share({ url: uri, message: "My mornings, trending up. morningque.netlify.app" });
        return;
      }
    } catch {}
    try {
      await Share.share({
        message:
          "I've been waking up with Morning Que — alarms that ease you awake with nature sound and guided sessions. Fall in love with your mornings: https://morningque.netlify.app",
      });
    } catch {}
  };
  const { profile } = useProfile();
  const { habits } = useHabits();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () =>
        fromDrawer ? (
          // Came from nav tray → re-open the drawer
          <Pressable
            onPress={() => (navigation as any).openDrawer()}
            style={{ marginLeft: 4, padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu-outline" size={26} color="#f5f5f7" />
          </Pressable>
        ) : (
          // Came from a screen (e.g. chat) → go back
          <Pressable
            onPress={() => router.back()}
            style={{ marginLeft: 4, padding: 4 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color="#f5f5f7" />
          </Pressable>
        ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginRight: 4 }}>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Ionicons name="share-outline" size={22} color="#f5f5f7" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings" as any)}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color="#f5f5f7" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, fromDrawer]);

  return (
    <View style={styles.container}>
    <AuroraBackground dim={0.5} />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      bounces={true}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreValue}>{profile?.score ?? 0}</Text>
        <Text style={styles.scoreDelta}>+{profile?.score ?? 0}</Text>
      </View>

      {/* Habit chart */}
      <PositivityChart chartRef={chartRef} />
      <HabitChart />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.day_streak ?? 0}</Text>
          <Text style={styles.statLabel}>DAY STREAK</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.sessions_completed ?? 0}</Text>
          <Text style={styles.statLabel}>SESSIONS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{habits.length}</Text>
          <Text style={styles.statLabel}>HABITS</Text>
        </View>
      </View>

      {/* Recent Activity — real sessions from the activity log */}
      {activity.length > 0 && (
        <>
          <View style={styles.sectionSep} />
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          {activity.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityDate}>
                {new Date(item.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  posCard: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 18,
    overflow: "hidden",
  },
  posInner: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  posToday: {
    color: "#34C759",
    fontSize: S.caption,
    fontFamily: F.semibold,
  },
  posHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  posLabel: {
    color: "#52525b",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  posTotal: {
    color: "#f5f5f7",
    fontSize: S.display,
    fontFamily: F.light,
  },
  posGain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(52,199,89,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  posGainText: {
    color: "#34C759",
    fontSize: S.caption,
    fontFamily: F.medium,
  },
  posFooter: {
    color: "#3f3f46",
    fontSize: S.micro,
    fontFamily: F.regular,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: "#020805",
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
    fontSize: S.clock,
    fontFamily: F.light,
    letterSpacing: -2,
  },
  scoreDelta: {
    color: "#22c55e",
    fontSize: S.body,
    fontFamily: F.medium,
  },

  // Chart
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
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
    fontSize: S.micro,
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
    fontSize: S.caption,
    fontFamily: F.semibold,
  },
  rangePillTextActive: {
    color: "#f5f5f7",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: "#a1a1aa",
    fontSize: S.micro,
    fontFamily: F.regular,
  },
  chartEmpty: {
    color: "#3f3f46",
    fontSize: S.caption,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 12,
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
    fontSize: S.heading,
    fontFamily: F.light,
  },
  statLabel: {
    color: "#8b8b93",
    fontSize: S.micro,
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
    color: "#8b8b93",
    fontSize: S.caption,
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
    fontSize: S.body,
    fontFamily: F.medium,
  },
  catMeta: {
    color: "#52525b",
    fontSize: S.caption,
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
    fontSize: S.body,
    fontFamily: F.medium,
    flex: 1,
  },
  activityDate: {
    color: "#8b8b93",
    fontSize: S.caption,
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
    fontSize: S.secondary,
    fontFamily: F.bold,
    letterSpacing: 1.5,
  },
});
