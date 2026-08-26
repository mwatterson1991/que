import { useMemo, useState, useEffect, useCallback } from "react";
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
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { artworkFor, groupIntoRails, channelArtwork } from "@/lib/catalog";
import type { Session } from "@/lib/types";

const MAX_CHARS = 280;
const CARD_W = 150;
const CARD_H = 150;

// ─── Helpers ──────────────────────────────────────────────
function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

// ─── Artwork card ─────────────────────────────────────────
function SessionCard({ session, wide }: { session: Session; wide?: boolean }) {
  const router = useRouter();
  const width = wide ? undefined : CARD_W;
  return (
    <Pressable
      onPress={() => router.push(`/player?id=${session.id}` as any)}
      style={[styles.card, wide && styles.cardWide, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`Play ${session.title}, ${formatDuration(session.duration_sec)}`}
    >
      <Image
        source={{ uri: artworkFor(session) }}
        style={[styles.cardArt, wide && styles.cardArtWide]}
        resizeMode="cover"
      />
      <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {session.title}
      </Text>
      <Text style={styles.cardMeta} maxFontSizeMultiplier={1.4}>
        {formatDuration(session.duration_sec)}
      </Text>
    </Pressable>
  );
}

// ─── Coming-soon card for empty channels ──────────────────
function ComingSoonCard({ channel }: { channel: string }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${channel}, coming soon`}>
      <View style={styles.comingSoonWrap}>
        <Image
          source={{ uri: channelArtwork(channel) }}
          style={[styles.cardArt, styles.comingSoonArt]}
          resizeMode="cover"
        />
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText} maxFontSizeMultiplier={1.4}>Coming soon</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {channel}
      </Text>
      <Text style={styles.cardMeta} maxFontSizeMultiplier={1.4}>In the works</Text>
    </View>
  );
}

// ─── Channel rail ─────────────────────────────────────────
function CategoryRail({ title, sessions }: { title: string; sessions: Session[] }) {
  return (
    <View style={styles.rail}>
      <Text style={styles.railTitle} maxFontSizeMultiplier={1.4}>{title}</Text>
      {sessions.length === 0 ? (
        <View style={styles.railContent}>
          <ComingSoonCard channel={title} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          horizontal
          keyExtractor={(s) => s.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
          renderItem={({ item }) => <SessionCard session={item} />}
        />
      )}
    </View>
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
  const [modalVisible, setModalVisible] = useState(false);

  // Open modal when header + button sets suggest param
  useEffect(() => {
    if (params.suggest === "1") {
      setModalVisible(true);
    }
  }, [params.suggest]);

  const rails = useMemo(() => groupIntoRails(sessions), [sessions]);

  const searchResults = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [sessions, query]);

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
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color="#52525b" />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#f5f5f7" style={{ marginTop: 40 }} />
      ) : query ? (
        // ── Search results: grid of cards ──
        <FlatList
          data={searchResults}
          keyExtractor={(s) => s.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <SessionCard session={item} wide />}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sessions match your search.</Text>
          }
          ListFooterComponent={<SuggestCard onPress={openModal} />}
        />
      ) : (
        // ── Browse: horizontal rails per channel ──
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.railsScroll}
        >
          {rails.map(([cat, list]) => (
            <CategoryRail key={cat} title={cat} sessions={list} />
          ))}
          <View style={styles.suggestWrap}>
            <SuggestCard onPress={openModal} />
          </View>
        </ScrollView>
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
    marginBottom: 8,
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

  // Rails
  railsScroll: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  rail: {
    marginBottom: 26,
  },
  railTitle: {
    color: "#f5f5f7",
    fontSize: 20,
    fontFamily: F.semibold,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  railContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  comingSoonWrap: {
    position: "relative",
  },
  comingSoonArt: {
    opacity: 0.45,
  },
  comingSoonBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonText: {
    color: "#f5f5f7",
    fontSize: 12,
    fontFamily: F.semibold,
    letterSpacing: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },

  // Cards
  card: {
    width: CARD_W,
  },
  cardWide: {
    flex: 1,
    maxWidth: "48%",
    marginBottom: 20,
  },
  cardArt: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    backgroundColor: "#1c1c1e",
    marginBottom: 8,
  },
  cardArtWide: {
    width: "100%",
    height: 160,
  },
  cardTitle: {
    color: "#f5f5f7",
    fontSize: 15,
    fontFamily: F.medium,
    marginBottom: 2,
  },
  cardMeta: {
    color: "#71717a",
    fontSize: 13,
    fontFamily: F.regular,
  },

  // Search results grid
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  gridRow: {
    justifyContent: "space-between",
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
  suggestWrap: {
    paddingHorizontal: 16,
  },
  suggestCard: {
    marginTop: 8,
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
