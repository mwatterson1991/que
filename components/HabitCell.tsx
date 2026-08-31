import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { Glass } from "@/components/Glass";
import { HabitIcon } from "@/components/HabitIcon";
import { F, S } from "@/lib/fonts";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// Two springs, not one: the first overshoots fast so the cell "pops" under the
// thumb, the second settles slower so it lands rather than snaps. Tuned to
// finish inside ~250ms — long enough to feel, short enough to tap seven in a row.
const POP = { damping: 12, stiffness: 420, mass: 0.5 };
const SETTLE = { damping: 15, stiffness: 240, mass: 0.6 };

export default function HabitCell({
  title,
  color,
  timesPerDay,
  count,
  streak,
  phase = 0,
  onToggle,
  onRemove,
}: {
  title: string;
  color: string;
  timesPerDay: number;
  count: number;
  streak: number;
  /** 0–1 sheen offset so a stack of cells doesn't shimmer in lockstep. */
  phase?: number;
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
        accessibilityRole="checkbox"
        accessibilityState={{ checked: complete }}
        accessibilityLabel={`${title}, ${count} of ${timesPerDay} today${streak > 1 ? `, ${streak} day streak` : ""}`}
        accessibilityHint="Tap to mark complete. Long press to remove."
      >
        <Glass interactive liquid phase={phase} intensity={0.85} style={styles.cell}>
          {/* A wash of the habit's own color once it's done — the cell itself
              reads as complete, so the checkmark isn't carrying it alone. */}
          {complete && (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: `${color}1F` }]}
              pointerEvents="none"
            />
          )}

          <HabitIcon title={title} color={color} />

          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {title}
            </Text>
            {!!meta && (
              <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {meta}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.ring,
              complete
                ? { backgroundColor: color, borderColor: color }
                : { backgroundColor: "transparent", borderColor: `${color}99` },
            ]}
          >
            {complete ? (
              <Ionicons name="checkmark" size={16} color="#0a0a0a" />
            ) : count > 0 ? (
              <Text style={[styles.ringCount, { color }]}>{count}</Text>
            ) : null}
          </View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 68,
  },
  body: {
    flex: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.medium,
  },
  meta: {
    color: "#c8c8d0", // light enough to survive a bright patch of aurora
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 3,
  },
  ring: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCount: {
    fontSize: S.micro,
    fontFamily: F.semibold,
  },
});
