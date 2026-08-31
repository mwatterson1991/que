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
import { Ticker } from "@/components/Ticker";
import { TICKER_HISTORY_DAYS } from "@/lib/positivity";
import { useHabits, useHabitLogs, useProfile, useActivity, useGratitudeEntries } from "@/lib/useSupabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Native screenshot module — lands with the next dev build; guarded so
// the current binary shares text until then.
let ViewShot: any = null;
try { ViewShot = require("react-native-view-shot"); } catch {}

// ─── Positivity ticker ───────────────────────────────────
// The top card is a stock ticker on yourself: current value, signed
// change, 1D/1W/1M/3M/1Y. It pulls one generous window of history and
// slices every range out of it client-side, so switching range is
// instant and every range agrees on where today sits.
function PositivityTicker({ chartRef, lifetimeScore }: { chartRef: any; lifetimeScore: number }) {
  const { entries } = useGratitudeEntries();
  const { logs } = useHabitLogs(TICKER_HISTORY_DAYS);

  return <Ticker gratitude={entries} habitLogs={logs} lifetimeScore={lifetimeScore} chartRef={chartRef} />;
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
  const insets = useSafeAreaInsets();
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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56 }]}
      bounces={true}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* The ticker leads the page — it names itself, so nobody has to guess
          what the number is. */}
      <PositivityTicker chartRef={chartRef} lifetimeScore={profile?.score ?? 0} />
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
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
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
