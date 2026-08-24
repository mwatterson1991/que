import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/types";

const CATEGORIES = ["All", "Sleep", "Confidence", "Addiction", "Anxiety", "Mindfulness"];
const MAX_CHARS = 280;

// ─── Helpers ──────────────────────────────────────────────
function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

function formatPlays(plays: number) {
  return plays.toLocaleString();
}

// ─── Session row ──────────────────────────────────────────
function SessionRow({ session }: { session: Session }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/player?id=${session.id}` as any)}
      style={styles.sessionRow}
      accessibilityRole="button"
      accessibilityLabel={`Play ${session.title}, ${session.narrator}, ${formatDuration(session.duration_sec)}`}
    >
      <Text style={styles.sessionTitle}>{session.title}</Text>
      <Text style={styles.sessionDescription}>{session.description}</Text>
      <View style={styles.sessionBottom}>
        <Text style={styles.sessionNarrator}>{session.narrator}</Text>
        <Text style={styles.sessionPlays}>{formatPlays(session.plays)}</Text>
        <Text style={styles.sessionDuration}>{formatDuration(session.duration_sec)}</Text>
      </View>
    </Pressable>
  );
}

// ─── End-of-list CTA card ─────────────────────────────────
function SuggestCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.suggestCard}
      accessibilityRole="button"
      accessibilityLabel="Didn't find what you were looking for? Suggest one"
    >
      <View style={styles.suggestCardInner}>
        <Text style={styles.suggestCardTitle}>Didn't find what you were looking for?</Text>
        <Text style={styles.suggestCardSub}>Suggest one →</Text>
      </View>
    </Pressable>
  );
}

// ─── Suggestion modal ─────────────────────────────────────
function SuggestionModal({
  visible,
  onClose,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string | undefined;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastSubmit, setLastSubmit] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setText("");
      setSuccess(false);
      setSubmitting(false);
    }
  }, [visible]);

  const canSubmit = text.trim().length > 0 && !submitting && !success;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Client-side cooldown: 10s between submits
    const now = Date.now();
    if (now - lastSubmit < 10_000) return;

    setSubmitting(true);

    // Optimistically show success immediately
    setSuccess(true);
    setSubmitting(false);
    setLastSubmit(now);

    // Fire-and-forget insert
    supabase
      .from("session_suggestions")
      .insert({
        suggestion_text: trimmed,
        user_id: userId ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn("[suggestions] insert error:", error.message);
      });

    // Auto-close after 1.5s
    setTimeout(onClose, 1500);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalContainer}
      >
        {/* Handle bar */}
        <View style={styles.modalHandle} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Suggest a Session</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.modalClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#71717a" />
          </Pressable>
        </View>

        {success ? (
          // ── Success state ──
          <View style={styles.successWrap}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>Got it. Thanks for the idea.</Text>
          </View>
        ) : (
          // ── Input state ──
          <View style={styles.modalBody}>
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
              placeholder="e.g. A 5-min session for handling Monday mornings"
              placeholderTextColor="#3f3f46"
              style={styles.modalInput}
              multiline
              autoFocus
              maxLength={MAX_CHARS}
              returnKeyType="default"
              scrollEnabled={false}
            />
            <Text style={styles.charCount}>
              {text.length}/{MAX_CHARS}
            </Text>

            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
            >
              <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                Submit
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────
export default function SearchScreen() {
  const { sessions, loading } = useSessions();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ suggest?: string }>();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);

  // Open modal when header + button sets suggest param
  useEffect(() => {
    if (params.suggest === "1") {
      setModalVisible(true);
    }
  }, [params.suggest]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesCategory =
        activeCategory === "All" || s.category === activeCategory;
      const matchesQuery =
        !query ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [sessions, activeCategory, query]);

  const openModal = useCallback(() => setModalVisible(true), []);
  const closeModal = useCallback(() => setModalVisible(false), []);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#71717a" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sessions, topics, goals..."
          placeholderTextColor="#52525b"
          style={styles.searchInput}
        />
      </View>

      {/* Category pills */}
      <View style={styles.pillWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.categoryPill, active && styles.categoryPillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                  maxFontSizeMultiplier={1.4}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color="#f5f5f7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          contentContainerStyle={styles.list}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sessions match your search.</Text>
          }
          ListFooterComponent={<SuggestCard onPress={openModal} />}
        />
      )}

      {/* Suggestion modal */}
      <SuggestionModal
        visible={modalVisible}
        onClose={closeModal}
        userId={user?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: 16,
    marginLeft: 10,
    fontFamily: F.regular,
  },

  // Category pills
  pillWrapper: {
    height: 44,
    marginBottom: 12,
  },
  pillScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    height: 44,
  },
  categoryPill: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    justifyContent: "center",
  },
  categoryPillActive: {
    backgroundColor: "#f5f5f7",
    borderColor: "#f5f5f7",
  },
  categoryText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontFamily: F.medium,
  },
  categoryTextActive: {
    color: "#000000",
    fontFamily: F.medium,
  },

  // Session rows
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sessionRow: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  sessionTitle: {
    color: "#f5f5f7",
    fontSize: 20,
    fontFamily: F.medium,
    marginBottom: 6,
  },
  sessionDescription: {
    color: "#71717a",
    fontSize: 15,
    fontFamily: F.regular,
    lineHeight: 21,
    marginBottom: 16,
  },
  sessionBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionNarrator: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
  },
  sessionPlays: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
    marginLeft: 12,
  },
  sessionDuration: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
    marginLeft: "auto",
  },

  // Empty
  emptyText: {
    color: "#52525b",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
    fontFamily: F.regular,
  },

  // Suggest card (end of list)
  suggestCard: {
    marginTop: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    borderStyle: "dashed",
    borderRadius: 14,
    overflow: "hidden",
  },
  suggestCardInner: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestCardTitle: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
    flex: 1,
    marginRight: 8,
  },
  suggestCardSub: {
    color: "#3f3f46",
    fontSize: 14,
    fontFamily: F.medium,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#2c2c2e",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: F.semibold,
    color: "#f5f5f7",
  },
  modalClose: {
    padding: 4,
  },

  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalInput: {
    backgroundColor: "#1c1c1e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#f5f5f7",
    fontSize: 16,
    fontFamily: F.regular,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#3f3f46",
    fontSize: 12,
    fontFamily: F.regular,
    textAlign: "right",
    marginTop: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#1c1c1e",
  },
  submitText: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: "#000000",
  },
  submitTextDisabled: {
    color: "#3f3f46",
  },

  // Success state
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    gap: 12,
  },
  successIcon: {
    fontSize: 32,
    color: "#4cd964",
  },
  successText: {
    fontSize: 17,
    fontFamily: F.medium,
    color: "#f5f5f7",
  },
});
