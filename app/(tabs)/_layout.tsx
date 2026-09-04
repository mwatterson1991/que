import { useEffect, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Icon, Txt, type IconName } from "@/components/ui";
import { C, PRESS_OPACITY, R, SP } from "@/lib/tokens";
import { TAB_BAR_GAP, TAB_BAR_HEIGHT } from "@/lib/nav";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

/**
 * Five tabs, the way Clock, Music and Fitness are arranged. Each tab is
 * its own native stack (see the _layout.tsx beside each index.tsx) so it
 * gets a real large-title header that collapses on scroll.
 *
 * The bar itself is a floating liquid-glass pill, inset from the screen
 * edges, with a smaller glass bubble behind the active tab that springs
 * across to whichever tab is selected. It floats over the scene rather
 * than docking beneath it, so tab roots pad their scroll content by
 * `TAB_BAR_INSET` (lib/nav.ts).
 */
const TAB: ReadonlyArray<{ name: string; title: string; icon: IconName }> = [
  { name: "alarms", title: "Alarms", icon: "bell" },
  { name: "search", title: "Sounds", icon: "music" },
  { name: "habit-track", title: "Habits", icon: "check-circle" },
  { name: "gratitude", title: "Gratitude", icon: "edit-3" },
  { name: "profile-page", title: "Progress", icon: "user" },
];

const ICON: Record<string, IconName> = Object.fromEntries(TAB.map((t) => [t.name, t.icon]));

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Liquid glass needs iOS 26; elsewhere the pill and bubble fall back to translucent fills. */
const GLASS = isLiquidGlassAvailable();
/** Inset between the pill's edge and the bubble / the tab items. */
const BUBBLE_PAD = 6;
const BUBBLE_HEIGHT = TAB_BAR_HEIGHT - BUBBLE_PAD * 2;
/** A quick, slightly under-damped settle — it should feel like the bubble has mass. */
const SPRING = { damping: 18, stiffness: 190, mass: 0.9 };

function GlassTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  // Routes expo-router hides (href: null) arrive with display: "none"; leave them out of the pill.
  const routes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as { tabBarItemStyle?: unknown } | undefined;
    const item = StyleSheet.flatten(options?.tabBarItemStyle as never) as { display?: string } | undefined;
    return item?.display !== "none";
  });
  const focusedKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(0, routes.findIndex((route) => route.key === focusedKey));

  // The bubble slides in "slots": the track is divided evenly between the tabs,
  // and translateX = slot index × slot width, sprung whenever the index changes.
  const [trackWidth, setTrackWidth] = useState(0);
  const slot = routes.length ? trackWidth / routes.length : 0;
  const position = useSharedValue(activeIndex);
  useEffect(() => {
    position.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, position]);
  const bubbleStyle = useAnimatedStyle(
    () => ({ transform: [{ translateX: position.value * slot }] }),
    [slot],
  );

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: insets.bottom + TAB_BAR_GAP }]}>
      <View
        style={styles.pill}
        onLayout={(e) => setTrackWidth(Math.max(0, e.nativeEvent.layout.width - BUBBLE_PAD * 2))}
      >
        {/* The pill: clear glass, so the scene shows through it. */}
        <GlassView
          glassEffectStyle="clear"
          style={[StyleSheet.absoluteFill, styles.pillGlass, !GLASS && styles.pillFallback]}
        />

        {/* The bubble: a sibling, not a child, of the pill's glass — glass on glass does not render. */}
        {slot > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.bubble, { width: slot }, bubbleStyle]}>
            <GlassView
              glassEffectStyle="regular"
              tintColor={C.glassTint}
              style={[styles.bubbleGlass, !GLASS && styles.bubbleFallback]}
            />
          </Animated.View>
        ) : null}

        <View style={styles.track}>
          {routes.map((route) => {
            const { options } = descriptors[route.key];
            const focused = route.key === focusedKey;
            const label =
              typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title ?? route.name;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                Haptics?.selectionAsync?.();
                navigation.navigate(route.name, route.params);
              }
            };
            const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID}
                style={({ pressed }) => [styles.item, pressed && !focused && { opacity: PRESS_OPACITY }]}
              >
                {/* Glyphs only; the label is for VoiceOver. */}
                <Icon name={ICON[route.name] ?? "circle"} size={26} color={focused ? C.label : C.labelTertiary} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="alarms"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Glyphs only, like Music and Photos.
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.labelTertiary,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {TAB.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SP.lg,
  },
  pill: {
    height: TAB_BAR_HEIGHT,
  },
  pillGlass: {
    borderRadius: R.pill,
  },
  pillFallback: {
    backgroundColor: C.glassFallback,
  },
  bubble: {
    position: "absolute",
    top: BUBBLE_PAD,
    left: BUBBLE_PAD,
    height: BUBBLE_HEIGHT,
  },
  bubbleGlass: {
    flex: 1,
    borderRadius: R.pill,
  },
  bubbleFallback: {
    backgroundColor: C.glassTint,
  },
  track: {
    position: "absolute",
    top: BUBBLE_PAD,
    left: BUBBLE_PAD,
    right: BUBBLE_PAD,
    bottom: BUBBLE_PAD,
    flexDirection: "row",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
});
