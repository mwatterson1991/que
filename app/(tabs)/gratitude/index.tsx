import { Fragment, useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGratitudeEntries } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { HandwritingField } from "@/components/HandwritingField";
import { Screen, Txt, Button, Divider } from "@/components/ui";
import { C, SP, T, PRESS_OPACITY } from "@/lib/tokens";

const TOTAL = 7;

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
  const { top: safeTop } = useSafeAreaInsets();
  const today = localDateString();

  // Reload whenever screen comes into focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Draft state for today's inputs (keyed by entry_number 1–7)
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const scrollRef = useRef<ScrollView>(null);
  const didFirstPin = useRef(false);

  // The list grows downward and the composer lives at the bottom, so "correct"
  // scroll position is always the end. First pin jumps (the screen should open
  // already at the bottom, not animate there); later ones glide.
  const pinToBottom = useCallback((animated: boolean) => {
    scrollRef.current?.scrollToEnd({ animated });
  }, []);

  // Keyboard appearing shrinks the ScrollView without changing its content
  // size, so onContentSizeChange never fires — re-pin explicitly or autoFocus
  // leaves the newest entries hidden behind the keyboard on first paint.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => pinToBottom(true));
    return () => sub.remove();
  }, [pinToBottom]);

  // Today's saved entries
  const todayEntries = useMemo(
    () => entries.filter((e) => e.entry_date === today),
    [entries, today]
  );

  const savedCount = todayEntries.length;
  const isComplete = savedCount >= TOTAL;

  // The one the composer at the bottom is currently collecting
  const activeNumber = Math.min(savedCount + 1, TOTAL);

  // Past days, OLDEST first — this reads as a transcript, so the most recent
  // thing sits nearest the composer, the way a chat does.
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

  // Commit one entry. Used by the composer (return key / Save button) and by
  // every saved row's blur — both paths existed before and both still upsert.
  const commit = async (n: number) => {
    const text = getValue(n).trim();
    if (!text || text === savedText(n)) {
      clearDraft(n);
      return;
    }
    clearDraft(n);
    await upsert(n, text, today);
    requestAnimationFrame(() => pinToBottom(true));
  };

  const header = <Stack.Screen options={{ title: "Journal" }} />;

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
          Today I'm grateful for…
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
  const canSend = composerText.trim().length > 0;

  return (
    <Screen>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // KeyboardAvoidingView measures its frame relative to its PARENT, but
        // the keyboard reports window coordinates. Under an opaque stack header
        // those differ by the bar's height (status area + one 44pt bar), so
        // that's the offset.
        keyboardVerticalOffset={safeTop + SP.hit}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            pinToBottom(didFirstPin.current);
            didFirstPin.current = true;
          }}
        >
          {/* ── Past days, oldest at the top ── */}
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
                  <Fragment key={e.id}>
                    {i > 0 && <Divider />}
                    <View style={styles.entry}>
                      <Txt kind="body" tone="tertiary" style={styles.index}>
                        {e.entry_number}
                      </Txt>
                      <Txt kind="body" style={styles.flex}>
                        {e.entry_text}
                      </Txt>
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
            .map((e, i) => (
              <Fragment key={e.id}>
                {i > 0 && <Divider />}
                <View style={styles.entry}>
                  <Txt kind="body" tone="tertiary" style={styles.index}>
                    {e.entry_number}
                  </Txt>
                  {/* Already written, so it renders fully drawn — no animation,
                      one merged <Path> per entry. Today's page stays in your
                      hand; the days above it are the typed-up record. */}
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
                    accessibilityLabel={`Gratitude ${e.entry_number}`}
                  />
                </View>
              </Fragment>
            ))}

          {/* ── Reward loop ── */}
          {isComplete ? (
            <View style={styles.complete}>
              <Ionicons name="checkmark-circle" size={T.title1} color={C.switchOn} />
              <Txt kind="footnote" style={styles.completeText}>
                Day complete — +{TOTAL} positivity today.
              </Txt>
              <Button
                tone="plain"
                title="See your graph"
                icon="trending-up"
                onPress={() => router.push("/profile-page" as any)}
                accessibilityLabel="See your positivity graph"
              />
            </View>
          ) : savedCount > 0 ? (
            <Button
              tone="plain"
              title={`+${savedCount} today · see your graph`}
              icon="trending-up"
              onPress={() => router.push("/profile-page" as any)}
              accessibilityLabel={`${savedCount} points earned today. See your graph`}
            />
          ) : null}

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

        {/* ── Composer: pinned to the bottom, a sibling of the ScrollView so
            the KeyboardAvoidingView lifts it and the transcript shrinks. ── */}
        {!isComplete && (
          <View style={styles.composer}>
            <View style={styles.promptRow}>
              <Txt kind="title3" style={styles.flex} maxFontSizeMultiplier={1.2}>
                Today I'm grateful for…
              </Txt>
              <Txt kind="subheadline" tone="secondary" maxFontSizeMultiplier={1.2}>
                {savedCount}/{TOTAL}
              </Txt>
            </View>
            <View style={styles.entry}>
              <Txt kind="body" tone="tertiary" style={styles.index}>
                {activeNumber}
              </Txt>
              {/* The live line. Each letter you type is drawn stroke by stroke on
                  a single-stroke script face, so the entry appears to be written
                  rather than printed. The input underneath is untouched. */}
              <HandwritingField
                value={composerText}
                onChangeText={(t) => setDrafts((d) => ({ ...d, [activeNumber]: t }))}
                onBlur={() => commit(activeNumber)}
                onSubmitEditing={() => commit(activeNumber)}
                placeholder={
                  savedCount === 0 ? "Something small counts…" : "And one more…"
                }
                strokeWidth={1.9}
                animate
                // The cursor is already blinking when you land — nothing to tap
                // before you can write.
                autoFocus
                returnKeyType={activeNumber < TOTAL ? "next" : "done"}
                // "submit" fires onSubmitEditing WITHOUT blurring, so hitting
                // return saves and the caret is instantly ready for the next one.
                submitBehavior={activeNumber < TOTAL ? "submit" : "blurAndSubmit"}
                maxFontSizeMultiplier={1.6}
                accessibilityLabel={`Gratitude ${activeNumber} of ${TOTAL}`}
              />
            </View>
            <Button
              title="Save"
              onPress={() => commit(activeNumber)}
              disabled={!canSend}
              accessibilityLabel="Save this entry"
            />
          </View>
        )}
      </KeyboardAvoidingView>
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
    paddingTop: SP.lg,
    paddingBottom: SP.md,
    flexGrow: 1,
    // Content sits at the BOTTOM of the scroll view when there's little of it,
    // so an empty day starts right above the composer instead of stranded at
    // the top with a wall of black beneath it.
    justifyContent: "flex-end",
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
  // first baseline, which sits one ascender below the top of the row.
  index: {
    width: 26,
  },

  // Composer
  composer: {
    gap: SP.md,
    paddingHorizontal: SP.xl,
    paddingVertical: SP.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
    backgroundColor: C.bg,
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.lg,
  },

  // Reward loop
  complete: {
    alignItems: "center",
    gap: SP.sm,
    marginTop: SP.xl,
    marginBottom: SP.md,
  },
  completeText: {
    color: C.switchOn,
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
