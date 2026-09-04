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

// The row never moves. The only motion is the check control itself dipping
// under the thumb for 100ms, short enough that the state change, not the
// animation, is what you notice.
const DIP_MS = 50;

/** Minimum row height: a real row you can hit without aiming. */
const CELL_HEIGHT = 64;
const CHECK = 28;
const CHECK_STROKE = 1.5;
/** Left inset of the separator under this row: where the text starts. */
export const HABIT_SEPARATOR_INSET = SP.screen + SP.xxl + SP.md;

/**
 * One habit, a plain row on black: the Feather glyph in the habit's own
 * colour, the title and its meta, and a round check on the right.
 *
 * Two targets. The text area opens the habit for editing; the check logs
 * it. Unchecked is a thin white ring; checked is a white disc with a black
 * tick. Counts between (a three times a day habit at 1) show the number in
 * the ring.
 */
export default function HabitCell({
  title,
  color,
  timesPerDay,
  count,
  streak,
  onToggle,
  onEdit,
}: {
  title: string;
  color: string;
  timesPerDay: number;
  count: number;
  streak: number;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const scale = useSharedValue(1);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const complete = count >= timesPerDay;

  const handleToggle = () => {
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
    streak > 1 ? `${streak >= 31 ? "31+" : streak} day streak` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const status = `${count} of ${timesPerDay} today${streak > 1 ? `, ${streak} day streak` : ""}`;

  return (
    <View style={styles.cell}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.main, pressed && styles.mainPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${status}`}
        accessibilityHint="Opens the habit to edit. Swipe left to delete."
      >
        <View style={styles.icon}>
          <HabitIcon title={title} color={color} />
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
      </Pressable>

      <Pressable
        onPress={handleToggle}
        style={styles.checkHit}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: complete }}
        accessibilityLabel={`Log ${title}`}
        accessibilityValue={{ text: status }}
      >
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
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: CELL_HEIGHT,
    paddingRight: SP.screen,
    backgroundColor: C.bg,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: SP.md,
    paddingLeft: SP.screen,
    paddingVertical: SP.md,
  },
  mainPressed: {
    backgroundColor: C.fill,
  },
  icon: {
    width: SP.xxl,
    alignItems: "center",
  },
  body: {
    flex: 1,
  },
  checkHit: {
    width: SP.hit,
    height: SP.hit,
    alignItems: "center",
    justifyContent: "center",
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
