import { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { channelArtwork, displayName } from "@/lib/catalog";
import { Artwork } from "@/components/SessionCard";
import {
  CARD_W,
  CARD_H,
  GLASS_PAD,
  Glass,
  GLASS_AVAILABLE,
  GLASS_FALLBACK,
  tapFeedback,
} from "@/components/cardLayout";

// The STATION card: the upsell at the END of every shelf. Not a track,
// a subscription to the whole station. It never plays anything; tapping
// it opens the paywall for that station.
//
// Same glass frame and artwork treatment as a sound card, but the
// caption is a kicker, the station's name and one direct promise, so it
// reads as the shelf's cover rather than one of its tracks.

const PROMISE: Record<string, string> = {
  Naturescapes: "A new recording every morning from a different place across the world.",
  "Positive Words": "A different reading every morning.",
  Frequencies: "Every tone, tuned to how you want to wake.",
  Hypnotherapy: "Every guided session, narrated by Brian.",
  Horoscope: "A fresh reading for your sign every morning.",
};

const FALLBACK_PROMISE = "New recordings every month.";

function ChannelCard({
  channel,
  count,
  onPress,
}: {
  channel: string;
  /** How many recordings the channel holds today (0 = still recording). */
  count: number;
  onPress: (channel: string) => void;
}) {
  const promise = PROMISE[channel] ?? FALLBACK_PROMISE;
  // No recording count next to the promise: "every morning · 5
  // recordings" read as a contradiction. The count is for VoiceOver.
  const kicker = count === 0 ? "STATION · COMING SOON" : "STATION";
  const meta = count === 0 ? "Coming soon" : count === 1 ? "1 recording" : `${count} recordings`;
  const name = displayName(channel);

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress(channel);
      }}
      style={({ pressed }) => [styles.frameWrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name} station. ${promise} ${meta}. Opens premium.`}
    >
      <Glass glassEffectStyle="clear" style={[styles.frame, !GLASS_AVAILABLE && GLASS_FALLBACK]}>
        <View style={styles.tile}>
          <Artwork uri={channelArtwork(channel)} />

          <View style={styles.caption}>
            <Txt kind="caption1" tone="secondary" maxFontSizeMultiplier={1.2}>
              {kicker}
            </Txt>
            <Txt kind="title2" numberOfLines={2} maxFontSizeMultiplier={1.25}>
              {name}
            </Txt>
            <Txt kind="footnote" tone="secondary" numberOfLines={3} maxFontSizeMultiplier={1.2}>
              {promise}
            </Txt>
            <View style={styles.unlockRow}>
              <Txt kind="footnote" maxFontSizeMultiplier={1.2}>
                Unlock
              </Txt>
              <Feather name="arrow-right" size={14} color={C.label} />
            </View>
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}

export default memo(ChannelCard);

const styles = StyleSheet.create({
  frameWrap: {
    width: CARD_W,
    height: CARD_H,
  },
  pressed: {
    opacity: PRESS_OPACITY,
  },
  frame: {
    flex: 1,
    borderRadius: R.xl,
    padding: GLASS_PAD,
    overflow: "hidden",
  },
  tile: {
    flex: 1,
    borderRadius: R.xl - GLASS_PAD,
    overflow: "hidden",
    backgroundColor: C.fill,
  },
  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SP.lg,
    gap: SP.xs,
  },
  unlockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.xs,
    marginTop: SP.xs,
  },
});
