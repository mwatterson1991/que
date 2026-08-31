import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGratitudeEntries } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { GlassButton } from "@/components/Glass";
import { F, S } from "@/lib/fonts";

const TOTAL = 7;

// WHY no AuroraBackground here: every other screen is a place you look at,
// this one is a page you write on. Michael's call — the moving glow fought the
// text. Pure black gives the entries maximum contrast and keeps the screen
// still while you're thinking.
const BG = "#000000";
const INK = "#f5f5f7"; // primary content — entries, today and past alike
const INK_DIM = "#9a9aa2"; // placeholders and date labels only, never content

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
    const dates = [...new Set(
      entries
        .filter((e) => e.entry_date !== today)
        .map((e) => e.entry_date)
    )];
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

  // Commit one entry. Used by the composer (return key / send button) and by
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#8b8b93" />
      </View>
    );
  }

  // No session at all (shouldn't happen behind the welcome gate)
  if (!user && !isGuest) {
    return (
      <View style={styles.gateWrap}>
        <Text style={styles.gateTitle} maxFontSizeMultiplier={1.2}>
          Today I'm grateful for…
        </Text>
        <Text style={styles.gateBody}>
          Write down seven things each morning and watch your positivity
          score grow day after day. A free account keeps your entries and
          your streak safe.
        </Text>
        <Pressable
          onPress={() => router.push("/auth")}
          accessibilityRole="button"
          accessibilityLabel="Create a free account"
        >
          <GlassButton tone="bright">
            <Text style={styles.gateButtonText}>Create a free account</Text>
          </GlassButton>
        </Pressable>
      </View>
    );
  }

  const composerText = drafts[activeNumber] ?? "";
  const canSend = composerText.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Prompt bar stays put while the transcript scrolls under it — on a
          writing surface the question shouldn't scroll away. */}
      <View style={styles.promptBar}>
        <Text style={styles.prompt} maxFontSizeMultiplier={1.2}>
          Today I'm grateful for…
        </Text>
        {isComplete ? (
          <Ionicons name="checkmark-circle" size={24} color="#4cd964" />
        ) : (
          <Text style={styles.counterText} maxFontSizeMultiplier={1.2}>
            <Text style={styles.counterNum}>{savedCount}</Text>
            <Text style={styles.counterDenom}>/{TOTAL}</Text>
          </Text>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // KeyboardAvoidingView measures its frame relative to its PARENT, but
        // the keyboard reports window coordinates. Under an opaque stack header
        // those differ by exactly the header's height, so that's the offset.
        // Computed rather than hardcoded so it's right on every notch/no-notch.
        keyboardVerticalOffset={insets.top + 44}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
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
              <View key={date} style={styles.historyGroup}>
                <Text style={styles.dayLabel}>{dateLabel(date)}</Text>
                {dayEntries.map((e) => (
                  <View key={e.id} style={styles.row}>
                    <Text style={styles.rowIndex}>{e.entry_number}</Text>
                    <Text style={styles.historyText} maxFontSizeMultiplier={1.6}>
                      {e.entry_text}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

          {/* ── Today, still editable in place ── */}
          {(savedCount > 0 || historyDates.length > 0) && (
            <Text style={styles.dayLabel}>Today</Text>
          )}
          {todayEntries
            .slice()
            .sort((a, b) => a.entry_number - b.entry_number)
            .map((e) => (
              <View key={e.id} style={styles.row}>
                <Text style={styles.rowIndex}>{e.entry_number}</Text>
                <TextInput
                  style={styles.rowInput}
                  value={getValue(e.entry_number)}
                  onChangeText={(t) =>
                    setDrafts((d) => ({ ...d, [e.entry_number]: t }))
                  }
                  onBlur={() => commit(e.entry_number)}
                  onSubmitEditing={() => commit(e.entry_number)}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  maxFontSizeMultiplier={1.6}
                  accessibilityLabel={`Gratitude ${e.entry_number}`}
                />
              </View>
            ))}

          {/* ── Reward loop ── */}
          {isComplete ? (
            <View style={styles.completeBlock}>
              <Text style={styles.completeText}>
                Day complete — +{TOTAL} positivity today.
              </Text>
              <Pressable
                onPress={() => router.push("/profile-page" as any)}
                accessibilityRole="button"
                accessibilityLabel="See your positivity graph"
              >
                <GlassButton tone="bright" phase={0.3} style={styles.progressButton}>
                  <Text style={styles.progressButtonText}>See your graph</Text>
                  <Ionicons name="trending-up" size={18} color="#ffffff" />
                </GlassButton>
              </Pressable>
            </View>
          ) : savedCount > 0 ? (
            <Pressable
              onPress={() => router.push("/profile-page" as any)}
              style={styles.todayPts}
              accessibilityRole="button"
              accessibilityLabel={`${savedCount} points earned today. See your graph`}
            >
              <Ionicons name="trending-up" size={14} color="#34C759" />
              <Text style={styles.todayPtsText}>+{savedCount} today · see your graph</Text>
            </Pressable>
          ) : null}

          {/* ── Soft account nudge for guests ── */}
          {isGuest && savedCount > 0 && (
            <Pressable
              onPress={() => router.push("/auth")}
              style={styles.syncNudge}
              accessibilityRole="button"
              accessibilityLabel="Create a free account to keep your entries safe"
            >
              <Text style={styles.syncNudgeText}>
                Your entries live on this phone. Create a free account to keep
                them safe.
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {/* ── Composer: pinned to the bottom, a sibling of the ScrollView so
            the KeyboardAvoidingView lifts it and the transcript shrinks. ── */}
        {!isComplete && (
          <View style={[styles.composer, { paddingBottom: 12 + insets.bottom }]}>
            <Text style={styles.composerIndex}>{activeNumber}</Text>
            <TextInput
              style={styles.composerInput}
              value={composerText}
              onChangeText={(t) => setDrafts((d) => ({ ...d, [activeNumber]: t }))}
              onBlur={() => commit(activeNumber)}
              onSubmitEditing={() => commit(activeNumber)}
              placeholder={
                savedCount === 0 ? "Something small counts…" : "And one more…"
              }
              placeholderTextColor={INK_DIM}
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
            <Pressable
              onPress={() => commit(activeNumber)}
              disabled={!canSend}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Save this entry"
              accessibilityState={{ disabled: !canSend }}
            >
              <Ionicons
                name="arrow-up-circle"
                size={32}
                color={canSend ? INK : "#3f3f46"}
              />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },

  // Prompt bar
  promptBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  prompt: {
    flex: 1,
    color: INK,
    fontSize: S.title,
    lineHeight: 30,
    fontFamily: "Lora",
    fontWeight: "400",
  },
  counterText: {
    fontSize: S.body,
  },
  counterNum: {
    color: INK,
    fontFamily: F.medium,
    fontSize: S.body,
  },
  counterDenom: {
    color: "#6b6b73",
    fontFamily: F.regular,
    fontSize: S.body,
  },

  // Transcript
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    flexGrow: 1,
    // Content sits at the BOTTOM of the scroll view when there's little of it,
    // so an empty day starts right above the composer instead of stranded at
    // the top with a wall of black beneath it.
    justifyContent: "flex-end",
  },
  historyGroup: {
    marginBottom: 24,
  },
  dayLabel: {
    color: "#6b6b73",
    fontSize: S.micro,
    fontFamily: F.medium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 11,
  },
  rowIndex: {
    width: 26,
    color: "#52525b",
    fontSize: S.secondary,
    fontFamily: F.regular,
    lineHeight: 24,
  },
  rowInput: {
    flex: 1,
    color: INK,
    fontSize: S.body,
    fontFamily: F.regular,
    paddingVertical: 0,
    lineHeight: 24,
  },
  historyText: {
    flex: 1,
    color: INK,
    fontSize: S.body,
    fontFamily: F.regular,
    lineHeight: 24,
  },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1c1c1e",
    backgroundColor: BG,
  },
  composerIndex: {
    width: 14,
    color: "#6b6b73",
    fontSize: S.secondary,
    fontFamily: F.medium,
  },
  composerInput: {
    flex: 1,
    color: INK,
    fontSize: S.body,
    fontFamily: F.regular,
    paddingVertical: 6,
  },

  // Reward loop
  completeBlock: {
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    marginBottom: 12,
  },
  completeText: {
    color: "#4cd964",
    fontSize: S.caption,
    fontFamily: F.regular,
  },
  progressButton: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  progressButtonText: {
    color: "#ffffff",
    fontSize: S.secondary,
    fontFamily: F.semibold,
  },
  todayPts: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  todayPtsText: {
    color: "#34C759",
    fontSize: S.caption,
    fontFamily: F.semibold,
  },

  syncNudge: {
    paddingVertical: 6,
  },
  syncNudgeText: {
    color: "#8b8b93",
    fontSize: S.caption,
    lineHeight: 19,
    fontFamily: F.regular,
    textDecorationLine: "underline",
    textDecorationColor: "#3f3f46",
  },

  // Guest gate
  gateWrap: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  gateTitle: {
    color: INK,
    fontSize: S.display,
    lineHeight: 42,
    fontFamily: "Lora",
    marginBottom: 14,
  },
  gateBody: {
    color: "#a1a1aa",
    fontSize: S.secondary,
    lineHeight: 23,
    fontFamily: F.regular,
    marginBottom: 28,
  },
  gateButtonText: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
});
