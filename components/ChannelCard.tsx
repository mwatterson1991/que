import { memo } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { channelArtwork } from "@/lib/catalog";
import { CARD_W, CARD_H, tapFeedback } from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The CHANNEL card: not a track, a subscription. Picking a channel means
// we wake you with a DIFFERENT recording from it every morning, so the
// card has to sell that promise in words — which is also why it must
// never be mistaken for a SessionCard at a glance.
//
// Same full-bleed artwork tile as a sound card, but the scrim carries a
// kicker, a bigger name, a line of copy and the promise, so it reads as
// a shelf's cover rather than one of its tracks.

const CHANNEL_COPY: Record<string, string> = {
  Naturescapes: "Real field recordings — dawn birds, rain, rivers, tide.",
  Hypnotherapy: "Guided sessions that reset how your day starts.",
  Frequencies: "Binaural tones tuned to a brain state.",
  Horoscope: "A short read on the day the sky is offering you.",
  "Positive Words": "Affirmations, scripture and stoics, read aloud.",
};

const FALLBACK_COPY = "A hand-picked collection, growing every week.";

function ChannelCard({
  channel,
  sessions,
  onPress,
}: {
  channel: string;
  sessions: Session[];
  onPress?: (channel: string) => void;
}) {
  const count = sessions.length;
  const empty = count === 0;
  const copy = CHANNEL_COPY[channel] ?? FALLBACK_COPY;
  const countLabel = count === 1 ? "1 recording" : `${count} recordings`;

  const body = (
    <>
      <Image
        source={{ uri: channelArtwork(channel) }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.caption}>
        <Txt kind="caption1" tone="secondary" maxFontSizeMultiplier={1.2}>
          {empty ? "CHANNEL" : `CHANNEL · ${countLabel.toUpperCase()}`}
        </Txt>
        <Txt kind="title2" numberOfLines={2} maxFontSizeMultiplier={1.25}>
          {channel}
        </Txt>
        <Txt kind="footnote" tone="secondary" numberOfLines={2} maxFontSizeMultiplier={1.25}>
          {copy}
        </Txt>

        {/* The promise. The one line on this card that has to survive
            every edit — it is the entire difference between a channel
            and a track. */}
        <View style={styles.promiseRow}>
          <Ionicons name={empty ? "time-outline" : "sunny-outline"} size={15} color={C.accent} />
          <Txt kind="footnote" tone="accent" numberOfLines={2} maxFontSizeMultiplier={1.2} style={styles.promise}>
            {empty ? "Coming soon — we're still recording." : "Wake to a fresh one every morning."}
          </Txt>
        </View>
      </View>
    </>
  );

  if (empty || !onPress) {
    return (
      <View
        style={styles.tile}
        accessible
        accessibilityLabel={`${channel} channel. ${copy} Coming soon.`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress(channel);
      }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${channel} channel. ${copy} ${countLabel}. Wakes you with a fresh recording every morning.`}
    >
      {body}
    </Pressable>
  );
}

export default memo(ChannelCard);

const styles = StyleSheet.create({
  tile: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: R.xl,
    overflow: "hidden",
    backgroundColor: C.fill,
  },
  pressed: {
    opacity: PRESS_OPACITY,
  },
  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SP.lg,
    gap: SP.xs,
    backgroundColor: C.scrim,
  },
  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    marginTop: SP.xs,
  },
  promise: {
    flex: 1,
  },
});
