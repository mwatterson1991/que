import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Glass, GlassButton } from "@/components/Glass";
import { F, S } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { artworkFor } from "@/lib/catalog";
import { usePremium, PRICE_MONTHLY, PRICE_YEARLY } from "@/lib/premium";

const BENEFITS = [
  "Every hypnotherapy session, narrated by Brian",
  "Daily horoscope readings",
  "The full frequencies + positive words library",
  "New sessions every month",
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { sessions } = useSessions();
  const { unlock } = usePremium();
  const [plan, setPlan] = useState<"yearly" | "monthly">("yearly");

  const session = sessions.find((s) => s.id === id);

  const startPremium = () => {
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

  return (
    <View style={styles.container}>
      {/* Artwork backdrop from the session that brought them here */}
      {session && (
        <Image
          source={{ uri: artworkFor(session) }}
          style={styles.backdrop}
          resizeMode="cover"
          blurRadius={6}
        />
      )}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="payScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
              <Stop offset="45%" stopColor="#000000" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#payScrim)" />
        </Svg>
      </View>

      {/* Same floating glass control the nav uses — the modal has no header
          bar, so the one piece of chrome it needs is a single glass button. */}
      <Pressable
        style={[styles.close, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Glass liquid phase={0.1} intensity={1.1} scrim="soft" style={styles.closeGlass}>
          <Ionicons name="close" size={22} color="#ffffff" />
        </Glass>
      </Pressable>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.2}>Morning Que</Text>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>Premium</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
              <Text style={styles.benefitText} maxFontSizeMultiplier={1.3}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Pressable
          style={[styles.plan, plan === "yearly" && styles.planActive]}
          onPress={() => setPlan("yearly")}
          accessibilityRole="button"
          accessibilityState={{ selected: plan === "yearly" }}
          accessibilityLabel={`Yearly plan, ${PRICE_YEARLY} per year`}
        >
          <View style={styles.planLeft}>
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.planSub}>{PRICE_YEARLY} / year · 2 months free</Text>
          </View>
          <Glass liquid phase={0.6} intensity={1.2} scrim="none" style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>BEST VALUE</Text>
          </Glass>
        </Pressable>
        <Pressable
          style={[styles.plan, plan === "monthly" && styles.planActive]}
          onPress={() => setPlan("monthly")}
          accessibilityRole="button"
          accessibilityState={{ selected: plan === "monthly" }}
          accessibilityLabel={`Monthly plan, ${PRICE_MONTHLY} per month`}
        >
          <View style={styles.planLeft}>
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planSub}>{PRICE_MONTHLY} / month</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.ctaWrap}
          onPress={startPremium}
          accessibilityRole="button"
          accessibilityLabel="Start premium"
        >
          <GlassButton tone="bright" phase={0.35} style={styles.cta}>
            <Text style={styles.ctaText}>Start Premium</Text>
          </GlassButton>
        </Pressable>
        <Text style={styles.finePrint} maxFontSizeMultiplier={1.3}>
          Cancel anytime. The free tier keeps working forever.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  close: {
    position: "absolute",
    left: 16,
    zIndex: 2,
  },
  closeGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
  },
  wordmark: {
    color: "rgba(255,255,255,0.6)",
    fontSize: S.secondary,
    fontFamily: "Lora",
    marginBottom: 2,
  },
  title: {
    color: "#f5f5f7",
    fontSize: S.display,
    fontFamily: "Lora",
    marginBottom: 18,
  },
  benefits: {
    gap: 10,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    color: "#d4d4d8",
    fontSize: S.secondary,
    fontFamily: F.regular,
    flex: 1,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#2c2c2e",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  planActive: {
    borderColor: "#f5f5f7",
  },
  planLeft: {
    flex: 1,
  },
  planTitle: {
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  planSub: {
    color: "#8b8b93",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 2,
  },
  bestBadge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestBadgeText: {
    color: "#ffffff",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 1,
  },
  ctaWrap: {
    marginTop: 8,
  },
  cta: {
    paddingVertical: 17,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  finePrint: {
    color: "#52525b",
    fontSize: S.micro,
    fontFamily: F.regular,
    textAlign: "center",
    marginTop: 12,
  },
});
