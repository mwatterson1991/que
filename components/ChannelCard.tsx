import { memo } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { Glass, TEXT_ON_IMAGE } from "@/components/Glass";
import { channelArtwork } from "@/lib/catalog";
import { TextScrim } from "@/components/SessionCard";
import { CARD_W, CARD_H, phaseFor, tapFeedback, toneFor } from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The CHANNEL card: not a track, a subscription. Picking a channel means
// we wake you with a DIFFERENT recording from it every morning, so the
// card has to sell that promise in words — which is also why it must
// never be mistaken for a SessionCard at a glance.
//
// Same clear glass panel and the same inset artwork as a sound card,
// but the proportions are pulled the other way: the picture is a band
// across the top and the words own the rest. A sound card is a picture
// with a name; a channel card is a promise with a picture.
//
// It used to be a deeply blurred photograph washed grey under a full
// sheet of glass. Blurred photography as a surface is exactly what
// we've just taken off the screen behind the app, so it comes off the
// card too — the channel's own colour does that job now.

const CHANNEL_COPY: Record<string, string> = {
  Naturescapes: "Real field recordings — dawn birds, rain, rivers, tide.",
  Hypnotherapy: "Guided sessions that reset how your day starts.",
  Frequencies: "Binaural tones tuned to a brain state.",
  Horoscope: "A short read on the day the sky is offering you.",
  "Positive Words": "Affirmations, scripture and stoics, read aloud.",
};

const FALLBACK_COPY = "A hand-picked collection, growing every week.";

// Noticeably shorter than a sound card's 0.56, so the two are never
// confused at a glance: a sound card is mostly picture, a channel card
// is mostly words and air.
const ART_H = Math.round(CARD_H * 0.44);

function ChannelCard({
  channel,
  sessions,
  index = 0,
  light = 1,
  onPress,
}: {
  channel: string;
  sessions: Session[];
  /** Position in its rail — only used to offset the glass shimmer. */
  index?: number;
  /** House-lights level (0–1) from the backdrop; scales the tint. */
  light?: number;
  onPress?: (channel: string) => void;
}) {
  const count = sessions.length;
  const empty = count === 0;
  const copy = CHANNEL_COPY[channel] ?? FALLBACK_COPY;
  const countLabel = count === 1 ? "1 recording" : `${count} recordings`;
  const tone = toneFor(channel, light);
  const scrimId = `channel-${channel.replace(/\W+/g, "-")}`;

  const body = (
    <Glass
      liquid
      phase={phaseFor(index)}
      scrim="none"
      style={[styles.frame, { borderColor: tone.edge }]}
    >
      {/* The channel's colour, held INSIDE the glass. On a channel card
          it runs a little stronger than on a sound card — this is the
          swatch for the whole shelf. */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tone.wash }]}
        pointerEvents="none"
      />

      <View
        style={[styles.art, { height: ART_H, backgroundColor: tone.well, borderColor: tone.edge }]}
      >
        <Image
          source={{ uri: channelArtwork(channel) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={styles.kicker}>
          <Ionicons name="radio-outline" size={11} color="#f5f5f7" />
          <Text style={styles.kickerText} maxFontSizeMultiplier={1.2}>
            {empty ? "CHANNEL" : `CHANNEL · ${countLabel.toUpperCase()}`}
          </Text>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <TextScrim id={scrimId} height="100%" accent={tone.accent} />

        <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={1.25}>
          {channel}
        </Text>
        <Text style={styles.desc} numberOfLines={2} maxFontSizeMultiplier={1.25}>
          {copy}
        </Text>

        {/* The promise. The one line on this card that has to survive
            every edit — it is the entire difference between a channel
            and a track. */}
        <View style={styles.promiseRow}>
          <Ionicons
            name={empty ? "time-outline" : "sunny-outline"}
            size={15}
            color={tone.accent}
          />
          <Text style={styles.promise} numberOfLines={2} maxFontSizeMultiplier={1.2}>
            {empty
              ? "Coming soon — we're still recording."
              : "Wake to a fresh one every morning."}
          </Text>
        </View>
      </View>
    </Glass>
  );

  if (empty || !onPress) {
    return (
      <View
        style={styles.card}
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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${channel} channel. ${copy} ${countLabel}. Wakes you with a fresh recording every morning.`}
    >
      {body}
    </Pressable>
  );
}

export default memo(ChannelCard);

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
  },

  frame: {
    flex: 1,
    borderRadius: 34,
    padding: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },

  // A band, not a poster: enough photograph to know what this channel
  // sounds like, not enough to become the card.
  art: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },

  kicker: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  kickerText: {
    color: "#f5f5f7",
    fontSize: S.micro,
    fontFamily: F.bold,
    letterSpacing: 1.4,
  },

  // Words own the bottom two thirds. Pinned low, so the space between
  // the artwork and the name is deliberate rather than left over.
  copyBlock: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 12,
    gap: 8,
  },
  name: {
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: F.bold,
    lineHeight: 27,
    letterSpacing: -0.3,
    ...TEXT_ON_IMAGE,
  },
  desc: {
    color: "rgba(255,255,255,0.82)",
    fontSize: S.secondary,
    fontFamily: F.medium,
    lineHeight: 21,
    ...TEXT_ON_IMAGE,
  },
  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  promise: {
    flex: 1,
    color: "#ffffff",
    fontSize: S.caption,
    fontFamily: F.semibold,
    lineHeight: 18,
    ...TEXT_ON_IMAGE,
  },
});
