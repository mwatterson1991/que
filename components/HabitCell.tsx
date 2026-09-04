import { Pressable, View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { HabitIcon } from "@/components/HabitIcon";
import { Icon, Txt } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// The cell never moves. The only motion is the check control itself dipping
// under the thumb for 100ms — short enough that the state change, not the
// animation, is what you notice.
const DIP_MS = 50;

/** Minimum cell height: a real row you can hit without aiming. */
const CELL_HEIGHT = 64;
const CHECK = 28;
const CHECK_STROKE = 1.5;

/**
 * One habit: a thin Feather glyph, the title and its meta, and a round check
 * on the right. Unchecked is a thin white ring; checked is a white disc with
 * a black tick. Counts between (a 3×-a-day habit at 1) show the number in
 * the ring.
 */
export default function HabitCell({
  title,
  timesPerDay,
  count,
  streak,
  onToggle,
  onRemove,
}: {
  title: string;
  timesPerDay: number;
  count: number;
  streak: number;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const scale = useSharedValue(1);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const complete = count >= timesPerDay;

  const handlePress = () => {
    // Flip first, feel second, animate last: the parent applies the new
    // state synchronously, so by the time the haptic lands the tick is there.
    onToggle();
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    scale.value = withSequence(
      withTiming(0.86, { duration: DIP_MS }),
      withTiming(1, { duration: DIP_MS })
    );
  };

  const meta = [
    timesPerDay > 1 ? `${count}/${timesPerDay} today` : "",
    streak > 1 ? `${streak >= 31 ? "31+" : streak}-day streak` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
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
      <View style={styles.icon}>
        <HabitIcon title={title} color={complete ? C.labelSecondary : C.label} />
      </View>

      <View style={styles.body}>
        <Txt kind="body" tone={complete ? "secondary" : "primary"} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {title}
        </Txt>
        {!!meta && (
          <Txt kind="footnote" tone="secondary" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {meta}
          </Txt>
        )}
      </View>

      <Animated.View style={[styles.check, complete && styles.checkOn, checkStyle]}>
        {complete ? (
          <Icon name="check" size={18} color={C.onAccent} />
        ) : count > 0 ? (
          <Txt kind="caption1" maxFontSizeMultiplier={1.2}>
            {count}
          </Txt>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    minHeight: CELL_HEIGHT,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    borderRadius: R.lg,
    backgroundColor: C.fill,
  },
  cellPressed: {
    backgroundColor: C.fillHigh,
  },
  icon: {
    width: SP.xxl,
    alignItems: "center",
  },
  body: {
    flex: 1,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: R.pill,
    borderWidth: CHECK_STROKE,
    borderColor: C.label,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: C.label,
    borderColor: C.label,
  },
});
