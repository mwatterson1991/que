import { useState } from "react";
import { View, ScrollView, StyleSheet, Image, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Txt, Section, Row, Button, IconButton } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import { useSessions } from "@/lib/useSupabase";
import { artworkFor } from "@/lib/catalog";
import { usePremium, PRICE_MONTHLY, PRICE_YEARLY } from "@/lib/premium";

const BENEFITS = [
  "Every hypnotherapy session, narrated by Brian",
  "Daily horoscope readings",
  "The full frequencies + positive words library",
  "New sessions every month",
];

const Check = <Ionicons name="checkmark" size={22} color={C.accent} />;

export default function PaywallScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
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

  const restore = () => {
    Alert.alert("Restore Purchases", "App Store billing is coming in the next build. Nothing to restore yet.");
  };

  return (
    <Screen>
      {/* Full-bleed artwork from the session that brought them here */}
      {session && (
        <Image source={{ uri: artworkFor(session) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* The modal has no header bar; one disc button closes it. */}
      <IconButton
        icon="close"
        label="Close"
        disc
        onPress={() => router.back()}
        style={[styles.close, { top: top + SP.sm }]}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Copy and choices sit on a flat scrim at the foot of the artwork */}
        <View style={[styles.foot, { paddingBottom: bottom + SP.lg }]}>
          <View style={styles.titles}>
            <Txt kind="footnote" tone="secondary" maxFontSizeMultiplier={1.2}>
              MORNING QUE
            </Txt>
            <Txt kind="editorial" maxFontSizeMultiplier={1.2}>
              Premium
            </Txt>
          </View>

          <Section header="Included">
            {BENEFITS.map((b) => (
              <Row key={b} icon="checkmark-circle" title={b} accessory="none" />
            ))}
          </Section>

          <Section header="Plan">
            <Row
              title="Yearly"
              subtitle={`${PRICE_YEARLY} / year · 2 months free`}
              value="Best value"
              onPress={() => setPlan("yearly")}
              accessory={plan === "yearly" ? Check : "none"}
              accessibilityLabel={`Yearly plan, ${PRICE_YEARLY} per year${plan === "yearly" ? ", selected" : ""}`}
            />
            <Row
              title="Monthly"
              subtitle={`${PRICE_MONTHLY} / month`}
              onPress={() => setPlan("monthly")}
              accessory={plan === "monthly" ? Check : "none"}
              accessibilityLabel={`Monthly plan, ${PRICE_MONTHLY} per month${plan === "monthly" ? ", selected" : ""}`}
            />
          </Section>

          <View style={styles.actions}>
            <Button title="Start Premium" onPress={startPremium} accessibilityLabel="Start premium" />
            <Button title="Restore Purchases" tone="plain" onPress={restore} style={styles.restore} />
            <Txt kind="footnote" tone="tertiary" maxFontSizeMultiplier={1.3} style={styles.finePrint}>
              Cancel anytime. The free tier keeps working forever.
            </Txt>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: {
    position: "absolute",
    left: SP.screen,
    zIndex: 2,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  foot: {
    paddingTop: SP.xxl,
    backgroundColor: C.scrim,
  },
  titles: {
    paddingHorizontal: SP.screen,
  },
  actions: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.xxl,
  },
  restore: {
    marginTop: SP.xs,
  },
  finePrint: {
    textAlign: "center",
    marginTop: SP.sm,
  },
});
