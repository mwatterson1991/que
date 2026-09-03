import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { HabitIcon } from "@/components/HabitIcon";
import { Txt } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// Two springs, not one: the first overshoots fast so the cell "pops" under the
// thumb, the second settles slower so it lands rather than snaps. Tuned to
// finish inside ~250ms — long enough to feel, short enough to tap seven in a row.
const POP = { damping: 12, stiffness: 420, mass: 0.5 };
const SETTLE = { damping: 15, stiffness: 240, mass: 0.6 };

/**
 * A Reminders-style list cell on the black ground: the habit's icon in its
 * own colour, title and meta, and a round check control on the right that
 * fills with the accent once the day's quota is met.
 */
export default function HabitCell({
  title,
  color,
  timesPerDay,
  count,
  streak,
  onToggle,
  onRemove,
}: {
  title: string;
  color: string;
  timesPerDay: number;
  count: number;
  streak: number;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const complete = count >= timesPerDay;

  const handlePress = () => {
    scale.value = withSequence(withSpring(1.06, POP), withSpring(1, SETTLE));

    // Soft impact is reserved for actually finishing the habit — the reward.
    // Every other tap (an increment on a 3x-a-day habit, or undoing) is a
    // selection tick, so the affirming thump keeps its meaning.
    const willComplete = !complete && count + 1 >= timesPerDay;
    if (willComplete) Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Soft);
    else Haptics?.selectionAsync?.();

    onToggle();
  };

  const meta = [
    timesPerDay > 1 ? `${count}/${timesPerDay} today` : "",
    streak > 1 ? `${streak >= 31 ? "31+" : streak}-day streak 🔥` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onLongPress={onRemove}
        delayLongPress={450}
        style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: complete }}
        accessibilityLabel={`${title}, ${count} of ${timesPerDay} today${streak > 1 ? `, ${streak} day streak` : ""}`}
        accessibilityHint="Tap to mark complete. Long press to remove."
      >
        <HabitIcon title={title} color={color} size={SP.xxxl} />

        <View style={styles.body}>
          <Txt kind="body" numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {title}
          </Txt>
          {!!meta && (
            <Txt kind="footnote" tone="secondary" numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {meta}
            </Txt>
          )}
        </View>

        <View style={[styles.ring, complete ? styles.ringOn : count > 0 ? styles.ringPartial : null]}>
          {complete ? (
            <Ionicons name="checkmark" size={18} color={C.onAccent} />
          ) : count > 0 ? (
            <Txt kind="caption1" tone="accent">
              {count}
            </Txt>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    minHeight: SP.row,
    paddingHorizontal: SP.screen,
    paddingVertical: SP.md,
    backgroundColor: C.bg,
  },
  cellPressed: {
    backgroundColor: C.fill,
  },
  body: {
    flex: 1,
  },
  ring: {
    width: SP.xxl,
    height: SP.xxl,
    borderRadius: R.pill,
    borderWidth: 2,
    borderColor: C.fillHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  ringPartial: {
    borderColor: C.accent,
  },
  ringOn: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
});
