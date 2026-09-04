import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, Txt, Divider, Icon, IconButton, type IconName } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import {
  PTS_PER_WAKE,
  PTS_PER_GRATITUDE,
  PTS_PER_HABIT,
  MISS_PENALTY,
  MAX_CONSECUTIVE_MISSES,
} from "@/lib/positivity";

/**
 * score-info.tsx — how your score works.
 *
 * The (i) beside "Your score" on Progress slides this up from the bottom.
 * Every number on it is imported from lib/positivity.ts, so the sheet
 * can't drift from what the graph actually does.
 */

const signed = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(n)}`;

const EARN: { icon: IconName; title: string; body: string; pts: number }[] = [
  {
    icon: "sunrise",
    title: "Waking up",
    body: "Finishing a session after your alarm.",
    pts: PTS_PER_WAKE,
  },
  {
    icon: "edit-3",
    title: "Gratitude",
    body: "Every line you write in your journal.",
    pts: PTS_PER_GRATITUDE,
  },
  {
    icon: "check-circle",
    title: "Habits",
    body: "Every habit you tick off.",
    pts: PTS_PER_HABIT,
  },
];

const WORDS: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };
const capWord = WORDS[MAX_CONSECUTIVE_MISSES] ?? String(MAX_CONSECUTIVE_MISSES);

function InfoLine({ icon, title, body, pts }: { icon: IconName; title: string; body: string; pts: number }) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${title}. ${body} ${signed(pts)} points.`}>
      <Icon name={icon} size={LINE_ICON} style={styles.lineIcon} />
      <View style={styles.lineBody}>
        <Txt kind="body">{title}</Txt>
        <Txt kind="footnote" tone="secondary">{body}</Txt>
      </View>
      <Txt kind="body" tone={pts < 0 ? "danger" : "primary"} style={styles.pts}>
        {signed(pts)}
      </Txt>
    </View>
  );
}

const LINE_ICON = 20;
const LINE_INSET = LINE_ICON + SP.md;

export default function ScoreInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, SP.md) }]}>
        <IconButton icon="x" label="Close" color={C.label} onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, SP.lg) + SP.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Txt kind="largeTitle">Your score</Txt>
        <Txt kind="body" tone="secondary" style={styles.lead}>
          One number for how your mornings are going. It climbs when you show up and eases back when
          you don't.
        </Txt>

        <Txt kind="footnote" tone="secondary" style={styles.header}>
          HOW YOU EARN
        </Txt>
        {EARN.map((row, i) => (
          <View key={row.title}>
            {i > 0 && <Divider inset={LINE_INSET} />}
            <InfoLine {...row} />
          </View>
        ))}

        <Txt kind="footnote" tone="secondary" style={styles.header}>
          QUIET DAYS
        </Txt>
        <InfoLine
          icon="moon"
          title="A day with nothing logged"
          body="Counted once the day is over, never while it's still going."
          pts={MISS_PENALTY}
        />

        <Txt kind="footnote" tone="secondary" style={styles.note}>
          After {capWord} quiet days in a row the score stops falling and waits for you.
        </Txt>
        <Txt kind="footnote" tone="secondary" style={styles.note}>
          Nothing counts against you before your first entry.
        </Txt>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: SP.sm,
  },
  scroll: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.sm,
  },
  lead: {
    marginTop: SP.sm,
  },
  header: {
    marginTop: SP.xxl,
    marginBottom: SP.xs,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: SP.row,
    paddingVertical: SP.md,
  },
  lineIcon: {
    width: LINE_ICON,
    marginRight: SP.md,
    textAlign: "center",
  },
  lineBody: {
    flex: 1,
    marginRight: SP.md,
  },
  pts: {
    fontVariant: ["tabular-nums"],
  },
  note: {
    marginTop: SP.md,
  },
});
