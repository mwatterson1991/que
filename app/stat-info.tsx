import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt, Button } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import { PTS_PER_HABIT } from "@/lib/positivity";

/**
 * stat-info.tsx — what a Progress tile means.
 *
 * Tapping Gratitude, Habits or Streak on Progress slides this half sheet
 * up. The number comes along as a param so the sheet opens on the same
 * figure you just tapped, and the words underneath say what it counts,
 * how it grows, and one thing worth doing about it.
 */

type StatKind = "gratitude" | "habits" | "streak";

const PTS_HABIT_WORD: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };
const habitPts = PTS_HABIT_WORD[PTS_PER_HABIT] ?? String(PTS_PER_HABIT);

const COPY: Record<StatKind, { title: string; unit: (n: number) => string; body: string[]; tip: string }> = {
  gratitude: {
    title: "Gratitude",
    unit: (n) => (n === 1 ? "line" : "lines"),
    body: [
      "Every line you have written in the Gratitude tab, since your first morning.",
      "Each line earns a point, and the seventh line of the day earns a bonus. Every line counts toward your streak.",
    ],
    tip: "One true line a morning beats five rushed ones.",
  },
  habits: {
    title: "Habits",
    unit: (n) => (n === 1 ? "habit" : "habits"),
    body: [
      "How many habits you are tracking right now.",
      `Each completion earns ${habitPts} points. Finishing all of them in a day is what moves your streak.`,
    ],
    tip: "Three to five habits is the sweet spot. Enough to shape a morning, few enough to finish.",
  },
  streak: {
    title: "Streak",
    unit: (n) => (n === 1 ? "day" : "days"),
    body: [
      "How many days in a row you have shown up. A habit, a gratitude line, or a finished session all count.",
      "Miss a day and it goes back to zero. The alarm exists to protect it.",
    ],
    tip: "Set the alarm the night before, so the morning is already decided.",
  },
};

const isStatKind = (k: unknown): k is StatKind => k === "gratitude" || k === "habits" || k === "streak";

export default function StatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { kind, value } = useLocalSearchParams<{ kind?: string; value?: string }>();

  const n = Number.parseInt(value ?? "", 10);
  const hasValue = Number.isFinite(n);

  // An unknown kind still gets a sheet, just a plain one.
  const copy = isStatKind(kind)
    ? COPY[kind]
    : {
        title: "Progress",
        unit: () => "",
        body: ["A number from your Progress page. It grows as you show up."],
        tip: "Mornings add up. Keep going.",
      };

  // A form sheet sized to its contents: the sheet takes its height from
  // this view, so nothing here may be flex: 1 or the sheet has nothing to
  // measure and opens empty.
  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SP.lg) }]}>
        <View style={styles.head} accessible accessibilityLabel={`${hasValue ? n : ""} ${copy.title}`.trim()}>
          {hasValue && (
            <Txt kind="stat" maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {n}
            </Txt>
          )}
          <Txt kind="title2" maxFontSizeMultiplier={1.2}>
            {copy.title}
            {hasValue && copy.unit(n) ? (
              <Txt kind="title2" tone="tertiary" maxFontSizeMultiplier={1.2}>
                {" "}{copy.unit(n)}
              </Txt>
            ) : null}
          </Txt>
        </View>

        <View style={styles.body}>
          {copy.body.map((line) => (
            <Txt key={line} kind="body" tone="secondary">
              {line}
            </Txt>
          ))}
          <Txt kind="body">{copy.tip}</Txt>
        </View>

        <Button tone="gray" title="Done" onPress={() => router.back()} style={styles.done} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: C.bg,
    paddingHorizontal: SP.screen + SP.xs,
    // The sheet's grabber sits above; leave it room.
    paddingTop: SP.xxl,
  },
  head: {
    gap: SP.xs,
  },
  body: {
    gap: SP.md,
    marginTop: SP.xl,
  },
  done: {
    marginTop: SP.xxl,
  },
});
