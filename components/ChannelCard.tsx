import { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { channelArtwork } from "@/lib/catalog";
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

// The CHANNEL card: the upsell at the END of every shelf. Not a track —
// a subscription to the whole channel. It never plays anything; tapping
// it opens the paywall for that channel.
//
// Same glass frame and artwork treatment as a sound card, but the
// caption is a kicker, the channel's name and one plain promise, so it
// reads as the shelf's cover rather than one of its tracks.

const PROMISE: Record<string, string> = {
  Naturescapes: "The full channel — a different real recording every morning.",
  "Positive Words": "The full channel — a different reading every morning.",
  Frequencies: "The full channel — every tone, tuned to how you want to wake.",
  Hypnotherapy: "The full channel — every guided session, narrated by Brian.",
  Horoscope: "The full channel — a fresh reading for your sign every morning.",
};

const FALLBACK_PROMISE = "The full channel — new recordings every month.";

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
  const kicker = count === 0 ? "CHANNEL · COMING SOON" : "CHANNEL";
  const meta = count === 0 ? "Coming soon" : count === 1 ? "1 recording" : `${count} recordings`;

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress(channel);
      }}
      style={({ pressed }) => [styles.frameWrap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${channel} channel. ${promise} ${meta}. Opens premium.`}
    >
      <Glass glassEffectStyle="clear" style={[styles.frame, !GLASS_AVAILABLE && GLASS_FALLBACK]}>
        <View style={styles.tile}>
          <Artwork uri={channelArtwork(channel)} />

          <View style={styles.caption}>
            <Txt kind="caption1" tone="secondary" maxFontSizeMultiplier={1.2}>
              {kicker}
            </Txt>
            <Txt kind="title2" numberOfLines={2} maxFontSizeMultiplier={1.25}>
              {channel}
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
