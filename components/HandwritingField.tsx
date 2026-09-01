/**
 * HandwritingField — a real text field that looks like it was written by hand.
 *
 * The TextInput is still the TextInput: keyboard, caret position, selection,
 * autocorrect, dictation, undo, VoiceOver and every submit/blur callback behave
 * exactly as they did. It is simply invisible — `color: "transparent"` — and
 * stretched over a HandwritingText layer that draws what it holds.
 *
 * The one thing we take over is the caret, because the native one sits at the
 * native font's metrics and would not line up with the letters we draw. We hide
 * it and draw our own at the offset the input reports, which also lets it park
 * at the pen while the hand is still catching up with your typing.
 */
import { useCallback, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type ReturnKeyTypeOptions,
  type TextInputSelectionChangeEventData,
} from "react-native";
import { HandwritingText } from "@/components/HandwritingText";
import { handwritingLineHeight } from "@/lib/hersheyFont";
import { F, S } from "@/lib/fonts";

export type HandwritingFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  placeholderColor?: string;
  color?: string;
  /** Ascender height of the handwriting, in px. */
  fontSize?: number;
  strokeWidth?: number;
  /** true draws letter by letter as you type; false renders fully written. */
  animate?: boolean;
  autoFocus?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  submitBehavior?: "newline" | "submit" | "blurAndSubmit";
  accessibilityLabel?: string;
  maxFontSizeMultiplier?: number;
};

export function HandwritingField({
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  placeholder,
  placeholderColor = "#9a9aa2",
  color = "#f5f5f7",
  fontSize = 18,
  strokeWidth = 1.8,
  animate = false,
  autoFocus,
  returnKeyType,
  submitBehavior,
  accessibilityLabel,
  maxFontSizeMultiplier,
}: HandwritingFieldProps) {
  const [width, setWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const lineHeight = handwritingLineHeight(fontSize);

  const onSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCaret(e.nativeEvent.selection.end);
    },
    []
  );

  const blurred = useRef(onBlur);
  blurred.current = onBlur;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <HandwritingText
        text={value}
        width={width}
        fontSize={fontSize}
        color={color}
        strokeWidth={strokeWidth}
        animate={animate}
        caretIndex={focused ? caret : null}
      />

      {value.length === 0 && placeholder ? (
        <Text
          style={[
            styles.placeholder,
            { color: placeholderColor, lineHeight: fontSize * 1.28 },
          ]}
          pointerEvents="none"
          importantForAccessibility="no"
        >
          {placeholder}
        </Text>
      ) : null}

      {/* The functional layer. Transparent, but in every other way the same
          input this screen has always used. */}
      <TextInput
        style={[
          StyleSheet.absoluteFill,
          styles.input,
          { lineHeight, fontSize: S.body },
        ]}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={onSelectionChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          blurred.current?.();
        }}
        onSubmitEditing={onSubmitEditing}
        // Multiline so long entries wrap the same way the handwriting does.
        // submitBehavior="submit" keeps return as SAVE rather than newline.
        multiline
        scrollEnabled={false}
        // We draw our own, aligned to the letterforms rather than to Switzer.
        caretHidden
        selectionColor="rgba(245,245,247,0.28)"
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        submitBehavior={submitBehavior}
        accessibilityLabel={accessibilityLabel}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-start" },
  input: {
    color: "transparent",
    fontFamily: F.regular,
    padding: 0,
    margin: 0,
    textAlignVertical: "top",
  },
  placeholder: {
    position: "absolute",
    left: 0,
    top: 0,
    fontSize: S.body,
    fontFamily: F.regular,
  },
});

export default HandwritingField;
