import { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useVideoPlayer } from "expo-video";
import { Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { channelArtwork, displayName, videoForChannel } from "@/lib/catalog";
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
// It has to read as a collection, not one more recording, so it is
// drawn as a deck: two dimmer cards peek out above the glass frame like
// a pile, the station's name sits large and centred with the kicker
// above and the promise below, and where the station has a clip, a
// muted loop plays behind the glass instead of the still.

const PROMISE: Record<string, string> = {
  Naturescapes: "A new recording every morning from a different place across the world.",
  "Positive Words": "A different reading every morning.",
  Frequencies: "Every tone, tuned to how you want to wake.",
  Hypnotherapy: "Every guided session, narrated by Brian.",
  Horoscope: "A fresh reading for your sign every morning.",
};

const FALLBACK_PROMISE = "New recordings every month.";

/** Each card behind the front one steps up this much and in this much. */
const DECK_STEP = 6;
const DECK_INSET = 10;

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

  // A null source makes an idle player, so the hook order never changes.
  const video = videoForChannel(channel);
  const player = useVideoPlayer(video, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
      <View style={[styles.deckCard, styles.deckBack]} />
      <View style={[styles.deckCard, styles.deckMid]} />

      <Glass glassEffectStyle="clear" style={[styles.frame, !GLASS_AVAILABLE && GLASS_FALLBACK]}>
        <View style={styles.tile}>
          <Artwork uri={channelArtwork(channel)} player={video ? player : null} />

          <View style={styles.caption}>
            <Txt kind="caption1" tone="secondary" style={styles.centred} maxFontSizeMultiplier={1.2}>
              {kicker}
            </Txt>
            <Txt kind="title1" numberOfLines={2} style={styles.centred} maxFontSizeMultiplier={1.2}>
              {name}
            </Txt>
            <Txt
              kind="footnote"
              tone="secondary"
              numberOfLines={3}
              style={styles.centred}
              maxFontSizeMultiplier={1.2}
            >
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
    // Room above the frame for the two cards behind it to peek out.
    paddingTop: DECK_STEP * 2,
  },
  pressed: {
    opacity: PRESS_OPACITY,
  },
  // The pile: the same rounded shape, narrower and dimmer with each
  // step back, anchored to the foot so only a top edge shows.
  deckCard: {
    position: "absolute",
    bottom: 0,
    borderRadius: R.xl,
  },
  deckBack: {
    top: 0,
    left: DECK_INSET * 2,
    right: DECK_INSET * 2,
    backgroundColor: C.fill,
  },
  deckMid: {
    top: DECK_STEP,
    left: DECK_INSET,
    right: DECK_INSET,
    backgroundColor: C.fillHigh,
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
    alignItems: "center",
  },
  centred: {
    textAlign: "center",
  },
  unlockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.xs,
    marginTop: SP.xs,
  },
});
