import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { C, SP, TYPE } from "@/lib/tokens";

/**
 * CollapsingHeader — the adaptive page title, the way Clock does it.
 *
 * At rest the page's name sits large at the top of the content on plain
 * black, with the bar buttons above it. As the list scrolls the large
 * title rides up with the content, shrinking and fading as it goes, and
 * a small centred title fades in on a gradient bar that the content
 * passes under. The page gets the whole screen to breathe.
 *
 *   const { scrollY, onScroll } = useCollapsingHeader();
 *   <CompactHeader title="Sounds" scrollY={scrollY} left={…} right={…} />
 *   <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
 *       contentInsetAdjustmentBehavior="never">
 *     <LargeTitle title="Sounds" scrollY={scrollY} />
 *     …
 *   </Animated.ScrollView>
 *
 * The screen's native header is hidden (headerShown: false); the bar
 * here is the header.
 */

/** The compact bar's height below the status bar, Apple's 44. */
export const BAR_H = 44;
/** How far the content travels before the large title is gone. */
const FADE = 40;
/** The gradient runs this far past the bar so content dissolves into it. */
const GRADIENT_TAIL = 28;

export function useCollapsingHeader() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  return { scrollY, onScroll };
}

/** Space the content must leave at the top for the bar. */
export function useHeaderInset(): number {
  const insets = useSafeAreaInsets();
  return insets.top + BAR_H;
}

/** The large title. Put it first inside the scroll content. */
export function LargeTitle({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const top = useHeaderInset();
  const style = useAnimatedStyle(() => {
    const p = interpolate(scrollY.value, [0, FADE], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: p,
      transform: [{ scale: interpolate(p, [0, 1], [0.86, 1]) }],
    };
  });
  return (
    <View style={[styles.large, { paddingTop: top }]}>
      <Animated.Text
        style={[styles.largeText, style]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header"
      >
        {title}
      </Animated.Text>
    </View>
  );
}

/** The bar over the content: buttons always, the small title once scrolled. */
export function CompactHeader({
  title,
  scrollY,
  left,
  right,
}: {
  title: string;
  scrollY: SharedValue<number>;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const h = insets.top + BAR_H;

  const bg = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE * 0.5, FADE + 16], [0, 1], Extrapolation.CLAMP),
  }));
  const small = useAnimatedStyle(() => {
    const p = interpolate(scrollY.value, [FADE * 0.7, FADE + 20], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: interpolate(p, [0, 1], [6, 0]) }] };
  });

  return (
    <View style={[styles.bar, { height: h, paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View style={[styles.gradient, { height: h + GRADIENT_TAIL }, bg]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.bg} stopOpacity="1" />
              <Stop offset={String(h / (h + GRADIENT_TAIL))} stopColor={C.bg} stopOpacity="0.94" />
              <Stop offset="1" stopColor={C.bg} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bar)" />
        </Svg>
      </Animated.View>

      <View style={styles.row} pointerEvents="box-none">
        <View style={styles.side}>{left}</View>
        <Animated.Text
          style={[styles.smallText, small]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          pointerEvents="none"
        >
          {title}
        </Animated.Text>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  large: {
    paddingHorizontal: SP.screen,
    paddingBottom: SP.sm,
  },
  largeText: {
    ...TYPE.largeTitle,
    color: C.label,
    transformOrigin: "left center",
  },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    height: BAR_H,
    flexDirection: "row",
    alignItems: "center",
    // The disc sits 2pt inside its 44pt hit area; this lines its edge
    // up with the large title's.
    paddingHorizontal: SP.screen - 2,
  },
  side: {
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  right: {
    justifyContent: "flex-end",
  },
  smallText: {
    ...TYPE.headline,
    color: C.label,
    flex: 1,
    textAlign: "center",
  },
});
