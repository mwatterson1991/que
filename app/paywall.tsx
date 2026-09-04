// ─── Payments ──────────────────────────────────────────────
// On iOS a digital subscription must be sold through Apple In-App
// Purchase (StoreKit); any other checkout is a rejection. The planned
// integration is RevenueCat (react-native-purchases) once the Paid Apps
// Agreement is signed and the two subscription products exist in App
// Store Connect. No payment SDK is wired yet: `startPremium` below is
// the placeholder that unlocks the device locally so the full app can
// be tested, and `PAYWALL_ENABLED` in lib/premium.ts keeps this screen
// out of the shipping build until real purchases exist.

import { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Alert, Linking, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer } from "expo-video";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { Txt, Icon, Button, IconButton, Divider } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";
import { feel, PRESS_SCALE, PRESS_SPRING } from "@/lib/feel";
import { useSessions } from "@/lib/useSupabase";
import { channelArtwork, channelFor, displayName, videoForChannel } from "@/lib/catalog";
import { Artwork } from "@/components/SessionCard";
import { Glass, GLASS_AVAILABLE, GLASS_FALLBACK } from "@/components/cardLayout";
import { usePremium, PRICE_MONTHLY, PRICE_YEARLY } from "@/lib/premium";

// Reached two ways: from a locked session (`id`) or from a channel card
// (`channel`). Either way the screen wears one station: its artwork,
// its clip where one exists, and one line about what the station is.

const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = Math.round(SCREEN_H * 0.45);
// The foot of the hero dissolves into the ground so the copy sits on
// black and the picture has no hard edge.
const FADE_START = 0.45;

const PROMISE: Record<string, string> = {
  Naturescapes: "A new recording every morning from a different place across the world.",
  "Positive Words": "A different reading every morning.",
  Frequencies: "Every tone, tuned to how you want to wake.",
  Hypnotherapy: "Every guided session, narrated by Brian.",
  Horoscope: "A fresh reading for your sign every morning.",
};
const PROMISE_FALLBACK = "Every station, every recording, every morning.";

const BENEFITS = [
  "Every station, every recording",
  "New recordings every month",
  "Wake to a different place each morning",
  "Cancel anytime in Settings",
];

const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = "https://mwatterson1991.github.io/morningque-site/privacy.html";

type Plan = "yearly" | "monthly";

export default function PaywallScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { id, channel } = useLocalSearchParams<{ id?: string; channel?: string }>();
  const { sessions } = useSessions();
  const { unlock } = usePremium();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [dockH, setDockH] = useState(0);

  const session = sessions.find((s) => s.id === id);
  const station = channel ?? (session ? channelFor(session) : undefined);
  const hero = station ? channelArtwork(station) : null;
  const name = station ? displayName(station) : "Premium";
  const promise = (station && PROMISE[station]) || PROMISE_FALLBACK;

  // A moving background where the station has a clip; the still
  // otherwise. Built either way, since hooks cannot be conditional.
  const videoUrl = station ? videoForChannel(station) : null;
  const video = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const choose = (next: Plan) => {
    if (next === plan) return;
    feel.tick();
    setPlan(next);
  };

  const startPremium = () => {
    feel.press();
    // Placeholder purchase: App Store billing lands with the production
    // build. This unlocks locally so the full experience is testable.
    Alert.alert(
      "Morning Que Premium",
      "App Store billing is coming in the next build. Unlock premium for this device now?",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Unlock",
          onPress: async () => {
            await unlock();
            if (id) router.replace(`/player?id=${id}` as any);
            else router.back();
          },
        },
      ],
    );
  };

  const restore = () => {
    feel.tap();
    Alert.alert("Restore Purchases", "App Store billing is coming in the next build. Nothing to restore yet.");
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: dockH + SP.lg }}
        showsVerticalScrollIndicator={false}
        horizontal={false}
      >
        {/* Hero: the station, full bleed, dissolving into the ground */}
        <View style={styles.hero}>
          {hero && (
            <Artwork uri={hero} player={videoUrl ? video : null} accessibilityLabel={`${name} artwork`} />
          )}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="paywallFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.bg} stopOpacity={0} />
                <Stop offset={FADE_START} stopColor={C.bg} stopOpacity={0} />
                <Stop offset="1" stopColor={C.bg} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#paywallFade)" />
          </Svg>

          <View style={styles.heroCopy}>
            <Txt kind="caption1" tone="secondary" style={styles.kicker} maxFontSizeMultiplier={1.2}>
              MORNING QUE
            </Txt>
            <Txt kind="largeTitle" maxFontSizeMultiplier={1.2}>
              {name}
            </Txt>
            <Txt kind="subheadline" tone="secondary" style={styles.promise}>
              {promise}
            </Txt>
          </View>
        </View>

        {/* What you get: four lines, never clipped */}
        <View style={styles.benefits}>
          {BENEFITS.map((line, i) => (
            <View key={line}>
              {i > 0 && <Divider />}
              <View style={styles.benefit}>
                <Icon name="check" size={18} style={styles.benefitGlyph} />
                <Txt kind="body" style={styles.benefitText}>
                  {line}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        {/* Plan: one of two */}
        <View style={styles.plans} accessibilityRole="radiogroup">
          <PlanRow
            title="Yearly"
            price={`${PRICE_YEARLY} / year`}
            badge="2 months free"
            selected={plan === "yearly"}
            onPress={() => choose("yearly")}
          />
          <PlanRow
            title="Monthly"
            price={`${PRICE_MONTHLY} / month`}
            selected={plan === "monthly"}
            onPress={() => choose("monthly")}
          />
        </View>
      </ScrollView>

      {/* The modal has no header bar; one disc button closes it. */}
      <IconButton
        icon="x"
        label="Close"
        disc
        onPress={() => router.back()}
        style={[styles.close, { top: top + SP.sm }]}
      />

      {/* The dock: one action, pinned above the home indicator */}
      <View
        style={[styles.dockWrap, { paddingBottom: Math.max(bottom, SP.lg) }]}
        onLayout={(e) => setDockH(e.nativeEvent.layout.height)}
      >
        <Glass glassEffectStyle="clear" style={[styles.dock, !GLASS_AVAILABLE && GLASS_FALLBACK]}>
          <Button title="Start Premium" onPress={startPremium} haptic={false} accessibilityLabel="Start premium" />
          <View style={styles.footnote}>
            <Pressable onPress={restore} hitSlop={8} accessibilityRole="link" accessibilityLabel="Restore purchase">
              <Txt kind="footnote" tone="secondary" maxFontSizeMultiplier={1.3}>
                Restore purchase
              </Txt>
            </Pressable>
            <View style={styles.legal}>
              <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8} accessibilityRole="link">
                <Txt kind="footnote" tone="tertiary" maxFontSizeMultiplier={1.3}>
                  Terms
                </Txt>
              </Pressable>
              <Txt kind="footnote" tone="tertiary" maxFontSizeMultiplier={1.3}>
                {" · "}
              </Txt>
              <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8} accessibilityRole="link">
                <Txt kind="footnote" tone="tertiary" maxFontSizeMultiplier={1.3}>
                  Privacy
                </Txt>
              </Pressable>
            </View>
          </View>
        </Glass>
      </View>
    </View>
  );
}

// ─── Plan row ──────────────────────────────────────────────
// A segmented choice drawn as two rows. The chosen one lifts to a
// lighter fill inside a white ring and shows a tick; the ring and the
// tick spring in rather than snap.

const RING = 1.5;

function PlanRow({
  title,
  price,
  badge,
  selected,
  onPress,
}: {
  title: string;
  price: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const on = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    on.value = withSpring(selected ? 1 : 0, PRESS_SPRING);
  }, [selected, on]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [C.fill, C.fillHigh]),
    borderColor: interpolateColor(on.value, [0, 1], ["rgba(255,255,255,0)", C.label]),
    transform: [{ scale: scale.value }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: 0.6 + on.value * 0.4 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(PRESS_SCALE, PRESS_SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, PRESS_SPRING); }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price}${badge ? `, ${badge}` : ""}`}
    >
      <Animated.View style={[styles.plan, rowStyle]}>
        <View style={styles.planText}>
          <View style={styles.planTitleRow}>
            <Txt kind="headline">{title}</Txt>
            {badge ? (
              <View style={styles.pill}>
                <Txt kind="caption2" tone="onAccent" style={styles.pillText} maxFontSizeMultiplier={1.2}>
                  {badge}
                </Txt>
              </View>
            ) : null}
          </View>
          <Txt kind="subheadline" tone="secondary">
            {price}
          </Txt>
        </View>
        <Animated.View style={[styles.tick, tickStyle]}>
          <Icon name="check" size={16} color={C.onAccent} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  close: {
    position: "absolute",
    right: SP.screen,
    zIndex: 2,
  },

  // Hero
  hero: {
    height: HERO_H,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroCopy: {
    paddingHorizontal: SP.screen,
    paddingBottom: SP.sm,
    gap: SP.xs,
  },
  kicker: {
    letterSpacing: 1.2,
    fontWeight: "600",
  },
  promise: {
    marginTop: SP.xs,
  },

  // Benefits
  benefits: {
    marginTop: SP.xl,
    paddingHorizontal: SP.screen,
  },
  benefit: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SP.md,
    paddingVertical: SP.md,
  },
  // Centred on the first line of body text (22pt line, 18pt glyph).
  benefitGlyph: {
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    flexShrink: 1,
  },

  // Plans
  plans: {
    marginTop: SP.xl,
    paddingHorizontal: SP.screen,
    gap: SP.sm,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    borderRadius: R.lg,
    borderWidth: RING,
    paddingVertical: SP.rowY,
    paddingHorizontal: SP.lg,
    minHeight: SP.row,
  },
  planText: {
    flex: 1,
    gap: 2,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SP.sm,
  },
  pill: {
    backgroundColor: C.switchOn,
    borderRadius: R.pill,
    paddingHorizontal: SP.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontWeight: "600",
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.label,
    alignItems: "center",
    justifyContent: "center",
  },

  // Dock
  dockWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SP.md,
  },
  dock: {
    borderRadius: R.xxl,
    overflow: "hidden",
    paddingHorizontal: SP.lg,
    paddingTop: SP.lg,
    paddingBottom: SP.lg,
  },
  footnote: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SP.sm,
    marginTop: SP.md,
    paddingHorizontal: SP.xs,
  },
  legal: {
    flexDirection: "row",
    alignItems: "center",
  },
});
