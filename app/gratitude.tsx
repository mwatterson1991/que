import { useRef, useState, useCallback, useMemo } from "react";
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
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGratitudeEntries } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { F, S } from "@/lib/fonts";

const TOTAL = 7;

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
  const { user } = useAuth();
  const router = useRouter();
  const today = localDateString();

  // Reload whenever screen comes into focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Draft state for today's inputs (keyed by entry_number 1–7)
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const inputRefs = useRef<Record<number, TextInput | null>>({});

  // Today's saved entries
  const todayEntries = useMemo(
    () => entries.filter((e) => e.entry_date === today),
    [entries, today]
  );

  const savedCount = todayEntries.length;
  const isComplete = savedCount >= TOTAL;

  // How many fields to show: all saved ones + 1 empty (up to TOTAL)
  const visibleCount = Math.min(savedCount + 1, TOTAL);

  // Historical entries grouped by date (excluding today)
  const historyDates = useMemo(() => {
    const dates = [...new Set(
      entries
        .filter((e) => e.entry_date !== today)
        .map((e) => e.entry_date)
    )];
    return dates.sort((a, b) => b.localeCompare(a));
  }, [entries, today]);

  const getValue = (n: number): string => {
    const saved = todayEntries.find((e) => e.entry_number === n);
    if (saved) return saved.entry_text;
    return drafts[n] ?? "";
  };

  const isSaved = (n: number) => todayEntries.some((e) => e.entry_number === n);

  const handleSubmit = async (n: number) => {
    const text = getValue(n).trim();
    if (!text) return;
    await upsert(n, text, today);
    // Move focus to next field
    if (n < TOTAL) {
      setTimeout(() => inputRefs.current[n + 1]?.focus(), 50);
    }
  };

  const handleBlur = (n: number) => {
    const text = getValue(n).trim();
    if (text && !isSaved(n)) {
      upsert(n, text, today);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#8b8b93" />
      </View>
    );
  }

  // Guests: this is where an account starts earning its keep
  if (!user) {
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
          style={styles.gateButton}
          onPress={() => router.push("/auth")}
          accessibilityRole="button"
          accessibilityLabel="Create a free account"
        >
          <Text style={styles.gateButtonText}>Create a free account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>
              Today I'm grateful for…
            </Text>
          </View>
          <View style={styles.counter}>
            {isComplete ? (
              <Ionicons name="checkmark-circle" size={22} color="#4cd964" />
            ) : (
              <Text style={styles.counterText}>
                <Text style={styles.counterNum}>{savedCount}</Text>
                <Text style={styles.counterDenom}>/{TOTAL}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* ── Today's entry fields ── */}
        <View style={styles.entriesSection}>
          {Array.from({ length: isComplete ? TOTAL : visibleCount }, (_, i) => {
            const n = i + 1;
            const saved = isSaved(n);
            const value = getValue(n);

            return (
              <View key={n} style={styles.entryRow}>
                <Text style={[styles.entryNumber, saved && styles.entryNumberSaved]}>
                  {n}
                </Text>
                <TextInput
                  ref={(r) => { inputRefs.current[n] = r; }}
                  style={[
                    styles.entryInput,
                    saved && styles.entryInputSaved,
                  ]}
                  value={value}
                  onChangeText={(t) => {
                    if (!saved) setDrafts((d) => ({ ...d, [n]: t }));
                    else {
                      // Allow editing saved entries
                      setDrafts((d) => ({ ...d, [n]: t }));
                    }
                  }}
                  onBlur={() => handleBlur(n)}
                  onSubmitEditing={() => handleSubmit(n)}
                  placeholder={saved ? "" : "Write something…"}
                  placeholderTextColor="#52525b"
                  returnKeyType={n < TOTAL ? "next" : "done"}
                  blurOnSubmit={n === TOTAL}
                  editable={true}
                  multiline={false}
                />
              </View>
            );
          })}
        </View>

        {/* ── Completion message ── */}
        {isComplete && (
          <Text style={styles.completeText}>
            Day complete — well done.
          </Text>
        )}

        {/* ── History ── */}
        {historyDates.length > 0 && (
          <View style={styles.history}>
            <View style={styles.historySep} />
            {historyDates.map((date) => {
              const dayEntries = entries
                .filter((e) => e.entry_date === date)
                .sort((a, b) => a.entry_number - b.entry_number);

              return (
                <View key={date} style={styles.historyGroup}>
                  <Text style={styles.historyDateLabel}>{dateLabel(date)}</Text>
                  {dayEntries.map((e) => (
                    <View key={e.id} style={styles.historyRow}>
                      <Text style={styles.historyNumber}>{e.entry_number}</Text>
                      <Text style={styles.historyText}>{e.entry_text}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: "#f5f5f7",
    fontSize: S.heading,
    lineHeight: 36,
    fontFamily: "Lora",
    fontWeight: "400",
    marginBottom: 4,
  },

  // Guest gate
  gateWrap: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  gateTitle: {
    color: "#f5f5f7",
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
  gateButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  gateButtonText: {
    color: "#0a0a0a",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  subtitle: {
    color: "#52525b",
    fontSize: S.secondary,
    fontFamily: F.regular,
  },
  counter: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  counterText: {
    fontSize: S.body,
  },
  counterNum: {
    color: "#f5f5f7",
    fontFamily: F.medium,
    fontSize: S.body,
  },
  counterDenom: {
    color: "#3f3f46",
    fontFamily: F.regular,
    fontSize: S.body,
  },

  // Entry rows
  entriesSection: {
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  entryNumber: {
    width: 28,
    color: "#8b8b93",
    fontSize: S.secondary,
    fontFamily: F.regular,
  },
  entryNumberSaved: {
    color: "#52525b",
  },
  entryInput: {
    flex: 1,
    color: "#8b8b93",
    fontSize: S.body,
    fontFamily: F.regular,
    paddingVertical: 0,
  },
  entryInputSaved: {
    color: "#f5f5f7",
  },

  // Completion
  completeText: {
    color: "#4cd964",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 20,
    marginBottom: 8,
  },

  // History
  history: {
    marginTop: 40,
  },
  historySep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1c1c1e",
    marginBottom: 32,
  },
  historyGroup: {
    marginBottom: 32,
  },
  historyDateLabel: {
    color: "#52525b",
    fontSize: S.caption,
    fontFamily: F.medium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  historyNumber: {
    width: 28,
    color: "#3f3f46",
    fontSize: S.secondary,
    fontFamily: F.regular,
  },
  historyText: {
    flex: 1,
    color: "#a1a1aa",
    fontSize: S.body,
    fontFamily: F.regular,
    lineHeight: 24,
  },
});
