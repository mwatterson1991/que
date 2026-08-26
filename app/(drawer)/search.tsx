import { useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import SoundsBrowser from "@/components/SoundsBrowser";

const MAX_CHARS = 280;

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
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Suggest a Sound</Text>
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
          <View style={styles.successWrap}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>Got it. Thanks for the idea.</Text>
          </View>
        ) : (
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
export default function SoundsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ suggest?: string }>();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (params.suggest === "1") {
      setModalVisible(true);
    }
  }, [params.suggest]);

  const openModal = useCallback(() => setModalVisible(true), []);
  const closeModal = useCallback(() => setModalVisible(false), []);

  return (
    <View style={styles.container}>
      <SoundsBrowser
        onPressSession={(session) => router.push(`/player?id=${session.id}` as any)}
        footer={
          <View style={styles.suggestWrap}>
            <SuggestCard onPress={openModal} />
          </View>
        }
      />
      <SuggestionModal visible={modalVisible} onClose={closeModal} userId={user?.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  suggestWrap: {
    paddingHorizontal: 16,
  },
  suggestCard: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
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
    color: "#f5f5f7",
    fontSize: S.secondary,
    fontFamily: F.medium,
    flex: 1,
    marginRight: 8,
  },
  suggestCardSub: {
    color: "#a1a1aa",
    fontSize: S.caption,
    fontFamily: F.medium,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
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
    fontSize: S.body,
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
    fontSize: S.body,
    fontFamily: F.regular,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#3f3f46",
    fontSize: S.micro,
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
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#000000",
  },
  submitTextDisabled: {
    color: "#3f3f46",
  },

  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    gap: 12,
  },
  successIcon: {
    fontSize: S.display,
    color: "#4cd964",
  },
  successText: {
    fontSize: S.body,
    fontFamily: F.medium,
    color: "#f5f5f7",
  },
});
