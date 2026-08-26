import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseAlarmUtterance } from "@/lib/parseAlarm";
import { F, S } from "@/lib/fonts";
import { useChatMessages, useAlarms } from "@/lib/useSupabase";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/lib/database.types";

type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

// ─── Typewriter effect ───────────────────────────────────
const typedMessages = new Set<string>();

function TypewriterText({
  text,
  id,
  style,
  speed = 25,
  onComplete,
}: {
  text: string;
  id: string;
  style: any;
  speed?: number;
  onComplete?: () => void;
}) {
  const alreadyTyped = typedMessages.has(id);
  const [displayed, setDisplayed] = useState(alreadyTyped ? text : "");

  useEffect(() => {
    if (alreadyTyped) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        typedMessages.add(id);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, id, speed, alreadyTyped]);

  return <Text style={style}>{displayed}</Text>;
}

const SUGGESTIONS = [
  { title: "Wake me at 7:30", subtitle: "with a boost of positivity" },
  { title: "Set a calm alarm", subtitle: "for tomorrow morning" },
  { title: "Help me fall asleep", subtitle: "with a deep relaxation session" },
  { title: "Remind me at 6am", subtitle: "to practice gratitude" },
];

export default function ChatScreen() {
  const { user } = useAuth();
  const { messages, loading, add: addMessage } = useChatMessages();
  const { add: addAlarm } = useAlarms();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const hasMessages = messages.length > 0;

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? draft).trim();
      if (!msg) return;
      setDraft("");

      // Save user message to Supabase
      await addMessage("user", msg);

      const alarm = parseAlarmUtterance(msg);
      if (alarm) {
        // Save alarm to Supabase
        const fire = new Date(alarm.nextFireAt);
        await addAlarm({
          label: alarm.label,
          next_fire_at: fire.toISOString(),
          repeat_days: alarm.repeatDays,
          mantra_id: alarm.mantraId,
          enabled: true,
        });

        await addMessage(
          "assistant",
          `Done. Alarm set for ${fire.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
        );
      } else {
        await addMessage(
          "assistant",
          'I couldn\'t pick out a time. Try "wake me at 7am with a calm mantra".'
        );
      }
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    },
    [draft, addMessage, addAlarm]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={80}
    >
      {/* ---------- MESSAGES or EMPTY STATE ---------- */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#71717a" />
        </View>
      ) : hasMessages ? (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {item.role === "assistant" ? (
                <TypewriterText
                  text={item.text}
                  id={item.id}
                  style={[styles.bubbleText, styles.assistantBubbleText]}
                  onComplete={() =>
                    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
                  }
                />
              ) : (
                <Text style={[styles.bubbleText, styles.userBubbleText]}>
                  {item.text}
                </Text>
              )}
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          {/* Floating mic button — above suggestions */}
          <Pressable style={styles.floatingMic}>
            <Ionicons name="mic" size={26} color="#000" />
          </Pressable>

          {/* Suggestion chips */}
          <View style={styles.suggestionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
            >
              {SUGGESTIONS.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => send(`${s.title} ${s.subtitle}`)}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionTitle}>{s.title}</Text>
                  <Text style={styles.suggestionSubtitle}>{s.subtitle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ---------- INPUT BAR ---------- */}
      <View style={styles.inputContainer}>
        <Pressable
          style={styles.inputBar}
          onPress={() => inputRef.current?.focus()}
        >
          <Pressable style={styles.plusButton}>
            <Ionicons name="add" size={22} color="#a1a1aa" />
          </Pressable>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Morning Q"
            placeholderTextColor="#52525b"
            multiline
            style={styles.textInput}
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
          {draft.trim().length > 0 ? (
            <Pressable onPress={() => send()} style={styles.sendButton}>
              <Ionicons name="arrow-up" size={16} color="#000" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => inputRef.current?.focus()}
              style={styles.sendButtonInactive}
            >
              <Ionicons name="arrow-up" size={16} color="#52525b" />
            </Pressable>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // -- Empty state --
  emptyState: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingBottom: 12,
    paddingRight: 20,
  },
  floatingMic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff9f0a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#ff9f0a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionsWrapper: {
    height: 64,
    alignSelf: "stretch",
  },
  suggestionsRow: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
    height: 64,
  },
  suggestionChip: {
    backgroundColor: "#15151c",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionTitle: {
    color: "#f5f5f7",
    fontSize: S.caption,
    fontFamily: F.semibold,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    color: "#71717a",
    fontSize: S.micro,
    fontFamily: F.regular,
  },

  // -- Message list --
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  bubble: {
    marginVertical: 4,
    maxWidth: "85%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2c2c2e",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
  },
  bubbleText: {
    fontSize: S.body,
    lineHeight: 22,
    fontFamily: F.regular,
  },
  userBubbleText: {
    color: "#f5f5f7",
    fontFamily: F.regular,
  },
  assistantBubbleText: {
    color: "#e4e4e7",
    fontFamily: F.regular,
  },

  // -- Input bar --
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c24",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.regular,
    maxHeight: 120,
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#f5f5f7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonInactive: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
