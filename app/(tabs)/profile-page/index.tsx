import { useMemo, useRef, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, useWindowDimensions, Share } from "react-native";
import Svg, { Polyline, Line, Circle } from "react-native-svg";
import { Stack, useRouter } from "expo-router";
import { Screen, Txt, Section, Row, IconButton } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { Ticker } from "@/components/Ticker";
import { TICKER_HISTORY_DAYS } from "@/lib/positivity";
import { useHabits, useHabitLogs, useProfile, useActivity, useGratitudeEntries } from "@/lib/useSupabase";

// Native screenshot module — lands with the next dev build; guarded so
// the current binary shares text until then.
let ViewShot: any = null;
try { ViewShot = require("react-native-view-shot"); } catch {}

// ─── Positivity ticker ───────────────────────────────────
// The page leads with a stock ticker on yourself: current value, signed
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

  const W = screenW - SP.screen * 2;
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
    <View style={styles.chart}>
      <Txt kind="footnote" tone="secondary" style={styles.chartHeader}>
        HABITS
      </Txt>

      {/* Time range segments */}
      <View style={styles.ranges}>
        {TIME_RANGES.map((r) => {
          const on = r === range;
          return (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={({ pressed }) => [
                styles.segment,
                on && styles.segmentOn,
                pressed && { opacity: PRESS_OPACITY },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Show ${r} range`}
              accessibilityState={{ selected: on }}
            >
              <Txt kind="footnote" tone={on ? "primary" : "secondary"} maxFontSizeMultiplier={1.4}>
                {r}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {/* SVG chart */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Horizontal grid */}
        {gridLines.map((y, i) => (
          <Line key={i} x1={padX} y1={y} x2={W - padX} y2={y} stroke={C.separator} strokeWidth="1" />
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

        {/* Vertical grid at the labelled dates */}
        {xLabels.map(({ i }) => (
          <Line key={`vg${i}`} x1={getX(i)} y1={padTop} x2={getX(i)} y2={padTop + chartH} stroke={C.separator} strokeWidth="1" />
        ))}
      </Svg>

      {/* X label row */}
      <View style={styles.labelRow}>
        {xLabels.map(({ i, label }) => (
          <Txt key={i} kind="caption1" tone="tertiary">{label}</Txt>
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
                style={({ pressed }) => [styles.legendItem, pressed && { opacity: PRESS_OPACITY }]}
                accessibilityRole="button"
                accessibilityLabel={`${hidden ? "Show" : "Hide"} ${habit.title} on chart`}
                accessibilityState={{ selected: !hidden }}
              >
                <View style={[styles.legendDot, { backgroundColor: hidden ? C.fillHighest : habit.color }]} />
                <Txt kind="caption1" tone={hidden ? "tertiary" : "secondary"}>
                  {habit.title}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}

      {habits.length === 0 && (
        <Txt kind="footnote" tone="tertiary" style={styles.chartEmpty}>
          Add habits to see your progress here.
        </Txt>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
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

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Progress",
          headerRight: () => (
            <View style={styles.barItems}>
              <IconButton icon="share-outline" label="Share" onPress={handleShare} />
              <IconButton
                icon="settings-outline"
                label="Settings"
                onPress={() => router.push("/settings" as any)}
              />
            </View>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        {/* The ticker leads the page — it names itself, so nobody has to guess
            what the number is. */}
        <PositivityTicker chartRef={chartRef} lifetimeScore={profile?.score ?? 0} />
        <HabitChart />

        <Section header="Stats">
          <Row icon="flame" title="Day streak" value={String(profile?.day_streak ?? 0)} accessory="none" />
          <Row icon="play-circle" title="Sessions" value={String(profile?.sessions_completed ?? 0)} accessory="none" />
          <Row icon="checkmark-circle" title="Habits" value={String(habits.length)} accessory="none" />
        </Section>

        {/* Recent Activity — real sessions from the activity log */}
        {activity.length > 0 && (
          <Section header="Recent activity">
            {activity.slice(0, 5).map((item) => (
              <Row
                key={item.id}
                title={item.title}
                value={new Date(item.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                accessory="none"
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  barItems: {
    flexDirection: "row",
  },

  // Chart
  chart: {
    paddingHorizontal: SP.screen,
    marginTop: SP.xl,
  },
  chartHeader: {
    marginLeft: SP.lg,
    marginBottom: SP.sm,
  },
  ranges: {
    flexDirection: "row",
    gap: SP.xs,
    marginBottom: SP.md,
  },
  segment: {
    flex: 1,
    paddingVertical: SP.sm,
    borderRadius: R.pill,
    alignItems: "center",
  },
  segmentOn: {
    backgroundColor: C.fillHigh,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SP.xs,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP.md,
    marginTop: SP.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
  },
  legendDot: {
    width: SP.sm,
    height: SP.sm,
    borderRadius: R.pill,
  },
  chartEmpty: {
    textAlign: "center",
    marginTop: SP.md,
  },
});
