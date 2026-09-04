import { useRef, type ReactNode } from "react";
import { TAB_BAR_INSET } from "@/lib/nav";
import { View, ScrollView, StyleSheet, Share } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Screen, Txt, Divider, Icon, IconButton, type IconName } from "@/components/ui";
import { SP } from "@/lib/tokens";
import { Ticker } from "@/components/Ticker";
import { TICKER_HISTORY_DAYS } from "@/lib/positivity";
import { useHabits, useHabitLogs, useProfile, useActivity, useGratitudeEntries } from "@/lib/useSupabase";

// Native screenshot module — lands with the next dev build; guarded so
// the current binary shares text until then.
let ViewShot: any = null;
try { ViewShot = require("react-native-view-shot"); } catch {}

/** Where the back chevron goes, keyed by the `from` the other tabs pass. */
const BACK_TARGET: Record<string, string> = {
  habits: "/habit-track",
  gratitude: "/gratitude",
};

// ─── Plain list ──────────────────────────────────────────
// Stats and activity live as rows on the black ground — a thin line
// between each, a thin line icon on the left, no grouped box.
function List({ header, children }: { header: string; children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={styles.list}>
      <Txt kind="footnote" tone="secondary" style={styles.listHeader}>
        {header.toUpperCase()}
      </Txt>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <Divider inset={LINE_INSET} />}
          {child}
        </View>
      ))}
    </View>
  );
}

const LINE_ICON = 20;
const LINE_INSET = LINE_ICON + SP.md;

function LineItem({ icon, title, value }: { icon: IconName; title: string; value: string }) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${title}, ${value}`}>
      <Icon name={icon} size={LINE_ICON} style={styles.lineIcon} />
      <Txt kind="body" style={styles.lineTitle} numberOfLines={1}>
        {title}
      </Txt>
      <Txt kind="body" tone="secondary" numberOfLines={1}>
        {value}
      </Txt>
    </View>
  );
}

// ─── The score ───────────────────────────────────────────
// The page leads with a stock ticker on yourself: current value, signed
// change, 1D/1W/1M/3M/1Y. It pulls one generous window of history and
// slices every range out of it client-side, so switching range is
// instant and every range agrees on where today sits.
function ScoreTicker({
  chartRef,
  lifetimeScore,
  onInfo,
}: {
  chartRef: any;
  lifetimeScore: number;
  onInfo: () => void;
}) {
  const { entries } = useGratitudeEntries();
  const { logs } = useHabitLogs(TICKER_HISTORY_DAYS);
  const { activity } = useActivity();

  return (
    <Ticker
      gratitude={entries}
      habitLogs={logs}
      sessions={activity}
      lifetimeScore={lifetimeScore}
      chartRef={chartRef}
      onInfo={onInfo}
    />
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const chartRef = useRef(null);
  const { activity } = useActivity();
  const { profile } = useProfile();
  const { habits } = useHabits();

  // Share your graph like a stock ticker on yourself. With the view-shot
  // module (next build) this attaches the actual chart as an image; until
  // then it falls back to text + link.
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
          "I've been waking up with Morning Que. Alarms that ease you awake with real nature sound and guided sessions. https://morningque.netlify.app",
      });
    } catch {}
  };

  // Habits and Journal push this tab with ?from=… so their "see your
  // graph" link has a way back. The param is cleared on the way out so a
  // later visit through the tab bar doesn't inherit a stale chevron.
  const backTarget = from ? BACK_TARGET[from] : undefined;
  const goBack = () => {
    router.setParams({ from: undefined } as any);
    if (backTarget) router.navigate(backTarget as any);
    else if (router.canGoBack()) router.back();
  };

  const openInfo = () => router.push("/score-info" as any);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Progress",
          headerLeft: backTarget
            ? () => <IconButton icon="chevron-left" label="Back" onPress={goBack} />
            : undefined,
          headerRight: () => (
            <View style={styles.barItems}>
              <IconButton icon="share" label="Share" onPress={handleShare} />
              <IconButton icon="settings" label="Settings" onPress={() => router.push("/settings" as any)} />
            </View>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_INSET }]}>
        <ScoreTicker chartRef={chartRef} lifetimeScore={profile?.score ?? 0} onInfo={openInfo} />

        <List header="Stats">
          <LineItem icon="zap" title="Day streak" value={String(profile?.day_streak ?? 0)} />
          <LineItem icon="sunrise" title="Sessions" value={String(profile?.sessions_completed ?? 0)} />
          <LineItem icon="check-circle" title="Habits" value={String(habits.length)} />
        </List>

        {/* Recent activity — real sessions from the activity log */}
        {activity.length > 0 && (
          <List header="Recent activity">
            {activity.slice(0, 5).map((item) => (
              <LineItem
                key={item.id}
                icon="play-circle"
                title={item.title}
                value={new Date(item.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              />
            ))}
          </List>
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

  list: {
    paddingHorizontal: SP.screen,
    marginTop: SP.xl,
  },
  listHeader: {
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
  lineTitle: {
    flex: 1,
    marginRight: SP.md,
  },
});
