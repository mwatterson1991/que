import { Fragment, useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { feel, PRESS_SPRING } from "@/lib/feel";
import { PTS_PER_GRATITUDE } from "@/lib/positivity";
import { useGratitudeEntries } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { HandwritingField } from "@/components/HandwritingField";
import { Screen, Txt, Button, Divider, Icon } from "@/components/ui";
import { C, SP, T, PRESS_OPACITY } from "@/lib/tokens";
import { TAB_BAR_INSET } from "@/lib/nav";

const TOTAL = 7;

// What a line is worth, shown in green beside it: one point per line and
// a bonus on the seventh. Mirrors the award in lib/useSupabase.ts.
const COMPLETION_BONUS = 3;
const pointsFor = (entryNumber: number) =>
  PTS_PER_GRATITUDE + (entryNumber === TOTAL ? COMPLETION_BONUS : 0);

// Rows are keyed by day and slot, not by id: a signed-in save lands as an
// optimistic row whose id is swapped for the real one a moment later, and
// the row must not remount (and re-animate) when that happens.
const rowKey = (date: string, entryNumber: number) => `${date}-${entryNumber}`;

// A freshly written line settles into place from just below.
const ENTER_ROW = FadeInDown.springify()
  .damping(PRESS_SPRING.damping)
  .stiffness(PRESS_SPRING.stiffness)
  .mass(PRESS_SPRING.mass)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

// The green points beside a line. On a line written just now it pops in a
// beat after the row has landed; on everything else it is simply there.
function Points({ entryNumber, pop }: { entryNumber: number; pop: boolean }) {
  const scale = useSharedValue(pop ? 0.6 : 1);
  const opacity = useSharedValue(pop ? 0 : 1);
  useEffect(() => {
    if (!pop) return;
    scale.value = withDelay(150, withSpring(1, PRESS_SPRING));
    opacity.value = withDelay(150, withSpring(1, PRESS_SPRING));
  }, [pop, scale, opacity]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[styles.pointsWrap, style]}>
      <Txt kind="footnote" style={styles.entryPoints} maxFontSizeMultiplier={1.2}>
        +{pointsFor(entryNumber)}
      </Txt>
    </Animated.View>
  );
}

// This is a page you write on, so it stays still: entries sit directly on
// the black ground for maximum contrast, with nothing moving behind them.

// ─── Date label helpers ──────────────────────────────────
function dateLabel(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const t = today.toLocaleDateString("en-CA");
  const y = yesterday.toLocaleDateString("en-CA");

  if (dateStr === t) return "Today";
  if (dateStr === y) return "Yesterday";

  // "Mon, Nov 17"
  const [yr, mo, day] = dateStr.split("-").map(Number);
  const d = new Date(yr, mo - 1, day);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function GratitudeScreen() {
  const { entries, loading, refresh, upsert, localDateString } = useGratitudeEntries();
  const { user, isGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = localDateString();

  // Reload whenever screen comes into focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Draft state for today's inputs (keyed by entry_number 1–7)
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const scrollRef = useRef<ScrollView>(null);

  // The page reads like a journal: oldest day at the top, today's lines
  // last, and the composer sits beneath them as its own view, outside the
  // scroll. Saving appends a line above it and the page follows.
  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);
  // Set when a save is in flight so the scroll follows the new line once
  // the transcript has actually grown, not before.
  const followNext = useRef(false);
  // Lines written during this visit. Only these animate in; whatever was
  // already on the page when the screen mounted just sits there.
  const addedKeys = useRef(new Set<string>());

  // ── Keyboard ──
  // KeyboardAvoidingView measures its own frame against its parent while
  // the keyboard reports window coordinates. Under a translucent header
  // the two disagree by however much sits above this view, so measure
  // that distance instead of guessing it, and again on every layout.
  const frameRef = useRef<View>(null);
  const [offsetY, setOffsetY] = useState(0);
  const measure = useCallback(() => {
    frameRef.current?.measureInWindow((_x, y) => setOffsetY(y));
  }, []);

  // With the keyboard down the composer has to clear the floating tab bar
  // and the home indicator; with it up, the keyboard covers both.
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () => {
      setKeyboardUp(true);
      requestAnimationFrame(scrollToEnd);
    });
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => {
      setKeyboardUp(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToEnd]);

  // Today's saved entries
  const todayEntries = useMemo(
    () => entries.filter((e) => e.entry_date === today),
    [entries, today]
  );

  const savedCount = todayEntries.length;
  const isComplete = savedCount >= TOTAL;

  // The one the composer at the bottom is currently collecting
  const activeNumber = Math.min(savedCount + 1, TOTAL);

  // Past days, OLDEST first, so the page reads top to bottom in time.
  const historyDates = useMemo(() => {
    const seen = new Set<string>();
    const dates: string[] = [];
    for (const e of entries) {
      if (e.entry_date === today || seen.has(e.entry_date)) continue;
      seen.add(e.entry_date);
      dates.push(e.entry_date);
    }
    return dates.sort((a, b) => a.localeCompare(b));
  }, [entries, today]);

  // The numbers compound. Storage still keeps entry_number 1–7 per day; what
  // is SHOWN is that number plus everything written on every earlier day, so
  // day one runs 1–7, day two 8–14, and the count only ever climbs. This map
  // holds each day's starting offset: the number of entries dated before it.
  const offsetByDate = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const e of entries) perDay.set(e.entry_date, (perDay.get(e.entry_date) ?? 0) + 1);
    const offsets = new Map<string, number>();
    let running = 0;
    for (const date of [...perDay.keys()].sort((a, b) => a.localeCompare(b))) {
      offsets.set(date, running);
      running += perDay.get(date) ?? 0;
    }
    // Today may have nothing saved yet and so no key: it still starts after
    // everything before it.
    if (!offsets.has(today)) offsets.set(today, running);
    return offsets;
  }, [entries, today]);

  const shownNumber = (date: string, entryNumber: number) =>
    (offsetByDate.get(date) ?? 0) + entryNumber;

  // A live draft always wins over the persisted text — otherwise keystrokes in
  // an already-saved row are swallowed by the server value.
  const getValue = (n: number): string => {
    const draft = drafts[n];
    if (draft !== undefined) return draft;
    return todayEntries.find((e) => e.entry_number === n)?.entry_text ?? "";
  };

  const clearDraft = (n: number) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[n];
      return next;
    });

  const savedText = (n: number) =>
    todayEntries.find((e) => e.entry_number === n)?.entry_text ?? "";

  // Commit one entry. Used by the composer's return key and by every saved
  // row's blur — both paths upsert.
  const commit = async (n: number) => {
    const text = getValue(n).trim();
    if (!text || text === savedText(n)) {
      clearDraft(n);
      return;
    }
    const isNew = !savedText(n);
    clearDraft(n);
    followNext.current = true;
    if (isNew) {
      addedKeys.current.add(rowKey(today, n));
      feel.success();
    }
    await upsert(n, text, today);
    requestAnimationFrame(scrollToEnd);
  };

  const seeGraph = () => router.push("/profile-page?from=gratitude" as any);

  const header = <Stack.Screen options={{ title: "Gratitude" }} />;

  if (loading) {
    return (
      <Screen style={styles.centered}>
        {header}
        <ActivityIndicator color={C.labelSecondary} />
      </Screen>
    );
  }

  // No session at all (shouldn't happen behind the welcome gate)
  if (!user && !isGuest) {
    return (
      <Screen style={styles.gate}>
        {header}
        <Txt kind="title2" maxFontSizeMultiplier={1.2}>
          Today I'm grateful for
        </Txt>
        <Txt kind="subheadline" tone="secondary" style={styles.gateBody}>
          Write down seven things each morning and watch your positivity
          score grow day after day. A free account keeps your entries and
          your streak safe.
        </Txt>
        <Button title="Create a free account" onPress={() => router.push("/auth")} />
      </Screen>
    );
  }

  const composerText = drafts[activeNumber] ?? "";

  // Once the seventh is in, the composer is gone and the transcript is the
  // bottom of the screen, so it reserves the tab bar's room itself.
  const transcriptBottom = isComplete ? TAB_BAR_INSET : SP.md;
  // The scroll view no longer reaches the bottom edge, so `automatic` adds
  // no home-indicator inset there; the composer carries it instead.
  const composerBottom = keyboardUp ? SP.md : TAB_BAR_INSET + insets.bottom;

  return (
    <Screen>
      {header}
      <View ref={frameRef} style={styles.flex} onLayout={measure}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={offsetY}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.scroll, { paddingBottom: transcriptBottom }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (!followNext.current) return;
              followNext.current = false;
              scrollToEnd();
            }}
          >
            {/* ── Past days, oldest first ── */}
            {historyDates.map((date) => {
              const dayEntries = entries
                .filter((e) => e.entry_date === date)
                .sort((a, b) => a.entry_number - b.entry_number);

              return (
                <View key={date} style={styles.day}>
                  <Txt kind="footnote" tone="secondary" style={styles.dayLabel}>
                    {dateLabel(date).toUpperCase()}
                  </Txt>
                  {dayEntries.map((e, i) => (
                    <Fragment key={rowKey(date, e.entry_number)}>
                      {i > 0 && <Divider />}
                      <View style={styles.entry}>
                        <Txt kind="body" tone="tertiary" style={styles.index}>
                          {shownNumber(date, e.entry_number)}
                        </Txt>
                        <Txt kind="body" style={styles.flex}>
                          {e.entry_text}
                        </Txt>
                        <Points entryNumber={e.entry_number} pop={false} />
                      </View>
                    </Fragment>
                  ))}
                </View>
              );
            })}

            {/* ── Today, still editable in place ── */}
            {(savedCount > 0 || historyDates.length > 0) && (
              <Txt kind="footnote" tone="secondary" style={styles.dayLabel}>
                TODAY
              </Txt>
            )}
            {todayEntries
              .slice()
              .sort((a, b) => a.entry_number - b.entry_number)
              .map((e, i) => {
                const key = rowKey(today, e.entry_number);
                const fresh = addedKeys.current.has(key);
                return (
                  <Fragment key={key}>
                    {i > 0 && <Divider />}
                    <Animated.View entering={fresh ? ENTER_ROW : undefined} style={styles.entry}>
                      <Txt kind="body" tone="tertiary" style={styles.index}>
                        {shownNumber(today, e.entry_number)}
                      </Txt>
                      {/* Already written, so it renders fully drawn: no animation,
                          one merged <Path> per entry. */}
                      <HandwritingField
                        value={getValue(e.entry_number)}
                        onChangeText={(t) =>
                          setDrafts((d) => ({ ...d, [e.entry_number]: t }))
                        }
                        onBlur={() => commit(e.entry_number)}
                        onSubmitEditing={() => commit(e.entry_number)}
                        strokeWidth={1.7}
                        returnKeyType="done"
                        submitBehavior="blurAndSubmit"
                        maxFontSizeMultiplier={1.6}
                        accessibilityLabel={`Gratitude ${shownNumber(today, e.entry_number)}`}
                      />
                      <Points entryNumber={e.entry_number} pop={fresh} />
                    </Animated.View>
                  </Fragment>
                );
              })}

            {/* ── Reward loop: points in green, the graph is a link ── */}
            {savedCount > 0 && (
              <View style={styles.reward}>
                <View style={styles.complete}>
                  {isComplete && <Icon name="check-circle" size={T.title2} />}
                  <Txt kind="headline" style={styles.points}>
                    {isComplete ? `Day complete, +${TOTAL} today` : `+${savedCount} today`}
                  </Txt>
                </View>
                <Button
                  tone="plain"
                  title="See your graph"
                  onPress={seeGraph}
                  accessibilityLabel="See your graph"
                />
              </View>
            )}

            {/* ── Soft account nudge for guests ── */}
            {isGuest && savedCount > 0 && (
              <Pressable
                onPress={() => router.push("/auth")}
                style={({ pressed }) => [styles.nudge, pressed && { opacity: PRESS_OPACITY }]}
                accessibilityRole="button"
                accessibilityLabel="Create a free account to keep your entries safe"
              >
                <Txt kind="footnote" tone="secondary">
                  Your entries live on this phone.{" "}
                  <Txt kind="footnote" tone="accent">Create a free account</Txt> to keep
                  them safe.
                </Txt>
              </Pressable>
            )}
          </ScrollView>

          {/* ── Composer: the last line on the page, always above the keyboard ── */}
          {!isComplete && (
            <View style={[styles.composer, { paddingBottom: composerBottom }]}>
              <View style={styles.promptRow}>
                <Txt kind="title3" style={styles.flex} maxFontSizeMultiplier={1.2}>
                  Today I'm grateful for
                </Txt>
                <Txt kind="subheadline" tone="secondary" maxFontSizeMultiplier={1.2}>
                  {savedCount} of {TOTAL} today
                </Txt>
              </View>
              <View style={styles.entry}>
                <Txt kind="body" tone="tertiary" style={styles.index}>
                  {shownNumber(today, activeNumber)}
                </Txt>
                {/* The live line. Each letter you type is drawn stroke by stroke on
                    a single-stroke script face, so the entry appears to be written
                    rather than printed. The input underneath is untouched. */}
                <HandwritingField
                  value={composerText}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [activeNumber]: t }))}
                  onBlur={() => commit(activeNumber)}
                  onSubmitEditing={() => commit(activeNumber)}
                  placeholder={savedCount === 0 ? "Something small counts" : "And one more"}
                  strokeWidth={1.9}
                  animate
                  // The cursor is already blinking when you land — nothing to tap
                  // before you can write.
                  autoFocus
                  returnKeyType="done"
                  // "submit" fires onSubmitEditing WITHOUT blurring, so Done saves
                  // and the caret is instantly ready for the next one. On the
                  // seventh the composer unmounts anyway. Done is the save; there
                  // is no button.
                  submitBehavior="submit"
                  maxFontSizeMultiplier={1.6}
                  accessibilityLabel={`Gratitude ${shownNumber(today, activeNumber)}, ${activeNumber} of ${TOTAL} today`}
                />
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Transcript
  scroll: {
    paddingHorizontal: SP.xl,
    // Headroom so the first handwritten line's ascenders clear the title.
    paddingTop: SP.xl + SP.md,
  },
  day: {
    marginBottom: SP.xl,
  },
  dayLabel: {
    marginBottom: SP.sm,
  },
  entry: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SP.md,
  },
  // Body text's line box lands the numeral's baseline on the handwriting's
  // first baseline, which sits one ascender below the top of the row. Wide
  // enough for three digits once the count has compounded for a while.
  index: {
    width: 36,
  },
  // Sits on the line's first baseline, like the index on the other side.
  pointsWrap: {
    paddingTop: 2,
    marginLeft: SP.md,
  },
  entryPoints: {
    color: C.switchOn,
    fontVariant: ["tabular-nums"],
  },

  // Composer
  composer: {
    gap: SP.md,
    paddingHorizontal: SP.xl,
    paddingTop: SP.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.lg,
  },

  // Reward loop
  reward: {
    gap: SP.md,
    marginTop: SP.xl,
    marginBottom: SP.md,
  },
  complete: {
    alignItems: "center",
    gap: SP.sm,
  },
  points: {
    textAlign: "center",
  },
  nudge: {
    paddingVertical: SP.sm,
  },

  // Guest gate
  gate: {
    justifyContent: "center",
    paddingHorizontal: SP.xxl,
  },
  gateBody: {
    marginTop: SP.md,
    marginBottom: SP.xxl,
  },
});
