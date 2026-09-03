import { useState, useEffect, useCallback } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  TextInput,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Section, Txt, Button, IconButton } from "@/components/ui";
import { C, SP, TYPE } from "@/lib/tokens";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import SoundsBrowser from "@/components/SoundsBrowser";

const MAX_CHARS = 280;

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
        style={styles.modal}
      >
        {/* A sheet has no navigator, so it carries its own one-line top
            row: the title and a close glyph. */}
        <View style={styles.modalTop}>
          <Txt kind="headline" style={styles.modalTitle}>
            Suggest a Sound
          </Txt>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>

        {success ? (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={44} color={C.accent} />
            <Txt kind="headline">Got it. Thanks for the idea.</Txt>
          </View>
        ) : (
          <>
            <Section header="Your idea" footer={`${text.length}/${MAX_CHARS}`}>
              <View style={styles.inputCell}>
                <TextInput
                  value={text}
                  onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
                  placeholder="e.g. A 5-min session for handling Monday mornings"
                  placeholderTextColor={C.labelTertiary}
                  selectionColor={C.accent}
                  style={styles.input}
                  multiline
                  autoFocus
                  maxLength={MAX_CHARS}
                  returnKeyType="default"
                  scrollEnabled={false}
                />
              </View>
            </Section>
            <Button
              title="Send"
              tone="prominent"
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={styles.send}
            />
          </>
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

  // The nav-bar button and any deep link both go through the `suggest`
  // param, so there is one way in. Closing clears it so the next tap
  // re-triggers the effect.
  const openSuggest = useCallback(() => router.setParams({ suggest: "1" }), [router]);
  const closeModal = useCallback(() => {
    setModalVisible(false);
    router.setParams({ suggest: "" });
  }, [router]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Sounds",
          headerRight: () => <IconButton icon="add" label="Suggest a sound" onPress={openSuggest} />,
        }}
      />
      <SoundsBrowser
        onPressSession={(session) => router.push(`/player?id=${session.id}` as any)}
        footer={<Button title="Suggest a Sound" tone="plain" onPress={openSuggest} />}
      />
      <SuggestionModal visible={modalVisible} onClose={closeModal} userId={user?.id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: SP.screen,
    paddingRight: SP.xs,
    paddingTop: SP.sm,
  },
  modalTitle: {
    flex: 1,
  },
  inputCell: {
    backgroundColor: C.fill,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    minHeight: 120,
  },
  input: {
    ...TYPE.body,
    color: C.label,
    textAlignVertical: "top",
  },
  send: {
    marginHorizontal: SP.screen,
    marginTop: SP.xl,
  },
  success: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SP.md,
    paddingBottom: SP.xxxl * 2,
  },
});
