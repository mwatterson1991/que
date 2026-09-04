import { useRef } from "react";
import { TAB_BAR_INSET } from "@/lib/nav";
import { View, ScrollView, StyleSheet, Share } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Screen, Txt, IconButton } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";
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

// ─── Stat tiles ──────────────────────────────────────────
// Three squares in a row under the chart: the number big and light, the
// label small beneath it. This is the one place a filled tile is allowed.
function Tile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}, ${value}`}>
      <Txt kind="stat" maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
      <Txt kind="caption1" tone="secondary">
        {label}
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
  const { profile } = useProfile();
  const { habits } = useHabits();
  const { entries } = useGratitudeEntries();

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

        <View style={styles.tiles}>
          <Tile value={entries.length} label="Gratitude" />
          <Tile value={habits.length} label="Habits" />
          <Tile value={profile?.day_streak ?? 0} label="Streak" />
        </View>
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

  tiles: {
    flexDirection: "row",
    gap: SP.md,
    paddingHorizontal: SP.screen,
    marginTop: SP.xl,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SP.xs,
    paddingHorizontal: SP.sm,
    backgroundColor: C.fill,
    borderRadius: R.md,
    // Apple's continuous (squircle) corner, not a plain arc.
    borderCurve: "continuous",
  },
});
