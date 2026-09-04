import { useState } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, Txt, Section, Row, Button, IconButton, Icon } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import { useSessions } from "@/lib/useSupabase";
import { artworkFor, channelArtwork, displayName } from "@/lib/catalog";
import { Artwork } from "@/components/SessionCard";
import { usePremium, PRICE_MONTHLY, PRICE_YEARLY } from "@/lib/premium";

// Reached two ways: from a locked session (`id`) or from a channel card
// (`channel`). A channel card is the upsell at the end of every shelf,
// so the paywall wears that channel's cover and says what the channel is.

const BENEFITS = [
  "Naturescapes. A new recording every morning from a different place across the world",
  "Positive Words. Prayers, scripture and the Stoics, read aloud",
  "Every hypnotherapy session, narrated by Brian",
  "The full frequencies library and daily horoscope readings",
  "New recordings every month",
];

const CHANNEL_LINE: Record<string, string> = {
  Naturescapes: "A new recording every morning from a different place across the world.",
  "Positive Words": "A different reading every morning.",
  Frequencies: "Every tone, tuned to how you want to wake.",
  Hypnotherapy: "Every guided session, narrated by Brian.",
  Horoscope: "A fresh reading for your sign every morning.",
};

const Check = <Icon name="check" size={22} />;

export default function PaywallScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { id, channel } = useLocalSearchParams<{ id?: string; channel?: string }>();
  const { sessions } = useSessions();
  const { unlock } = usePremium();
  const [plan, setPlan] = useState<"yearly" | "monthly">("yearly");

  const session = sessions.find((s) => s.id === id);
  const hero = session ? artworkFor(session) : channel ? channelArtwork(channel) : null;
  const channelLine = channel ? CHANNEL_LINE[channel] : undefined;

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
      {/* Full-bleed artwork: the session or the channel that brought them here */}
      {hero && <Artwork uri={hero} />}

      {/* The modal has no header bar; one disc button closes it. */}
      <IconButton
        icon="x"
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
              {channel ? displayName(channel) : "Premium"}
            </Txt>
            {channelLine ? (
              <Txt kind="subheadline" tone="secondary" maxFontSizeMultiplier={1.3} style={styles.channelLine}>
                {channelLine}
              </Txt>
            ) : null}
          </View>

          <Section header="Included">
            {BENEFITS.map((b) => (
              <Row key={b} icon="check-circle" title={b} accessory="none" />
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
    right: SP.screen,
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
  // Right padding keeps the title clear of the close button above it.
  titles: {
    paddingLeft: SP.screen,
    paddingRight: SP.screen + SP.hit,
  },
  channelLine: {
    marginTop: SP.sm,
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
