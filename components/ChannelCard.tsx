import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { Glass } from "@/components/Glass";
import { artworkFor, channelArtwork } from "@/lib/catalog";
import { Scrim } from "@/components/SessionCard";
import { CARD_W, CARD_H, tapFeedback } from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The CHANNEL card: not a track, a subscription. Picking a channel means
// we wake you with a DIFFERENT recording from it every morning, so the
// card has to sell that promise in words — which is also why it looks
// nothing like a SessionCard: glass sheet over a soft blurred collage
// instead of one dominant photograph, and a text block instead of a
// title. If you can mistake it for a sound at a glance, it has failed.

const CHANNEL_COPY: Record<string, string> = {
  Naturescapes: "Real field recordings — dawn birds, rain, rivers, tide.",
  Hypnotherapy: "Guided sessions that reset how your day starts.",
  Frequencies: "Binaural tones tuned to a brain state.",
  Horoscope: "A short read on the day the sky is offering you.",
  "Positive Words": "Affirmations, scripture and stoics, read aloud.",
};

const FALLBACK_COPY = "A hand-picked collection, growing every week.";

/** Three artworks for the collage, padded when the channel is thin. */
function collageFor(channel: string, sessions: Session[]): string[] {
  const art = sessions.slice(0, 3).map(artworkFor);
  while (art.length < 3) art.push(channelArtwork(channel));
  return art;
}

export default function ChannelCard({
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
    <View style={styles.frame}>
      {/* Blurred collage is a SIBLING under the glass sheet, not a child
          of it — a GlassView only refracts what is drawn behind it, and
          "no single photo dominates" is this card's main visual tell. */}
      <View style={styles.collage} pointerEvents="none">
        {collageFor(channel, sessions).map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={styles.collageTile}
            blurRadius={22}
            resizeMode="cover"
          />
        ))}
      </View>
      <View style={styles.wash} pointerEvents="none" />
      <Glass style={styles.sheet} pointerEvents="none" />
      <Scrim id={`channel-${channel.replace(/\W+/g, "-")}`} height="78%" />

      <View style={styles.inner}>
        <View style={styles.kicker}>
          <Ionicons name="radio-outline" size={12} color="#f5f5f7" />
          <Text style={styles.kickerText} maxFontSizeMultiplier={1.2}>
            CHANNEL
          </Text>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={1.25}>
            {channel}
          </Text>
          <Text style={styles.desc} numberOfLines={2} maxFontSizeMultiplier={1.25}>
            {copy}
          </Text>

          <View style={styles.rule} />

          <View style={styles.promiseRow}>
            <Ionicons
              name={empty ? "time-outline" : "sunny-outline"}
              size={15}
              color="#f5f5f7"
            />
            <Text style={styles.promise} numberOfLines={2} maxFontSizeMultiplier={1.2}>
              {empty
                ? "Coming soon — we're still recording."
                : "Wake to a fresh one every morning."}
            </Text>
          </View>

          {!empty && (
            <View style={styles.countPill}>
              <Text style={styles.countText} maxFontSizeMultiplier={1.2}>
                {countLabel} inside
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
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
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#0a0d0a",
  },
  // Full-bleed glass pane over the collage — the channel card is
  // glass-forward where the sound card is only glass-framed.
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
  },

  collage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  collageTile: {
    flex: 1,
    height: "100%",
    opacity: 0.75,
  },
  // Flattens the collage's contrast so the text below has a predictable
  // floor no matter which three photos land here.
  wash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(4,10,6,0.42)",
  },

  inner: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },

  kicker: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  kickerText: {
    color: "#f5f5f7",
    fontSize: S.micro,
    fontFamily: F.bold,
    letterSpacing: 1.6,
  },

  copyBlock: {
    gap: 8,
  },
  name: {
    color: "#ffffff",
    fontSize: S.heading,
    fontFamily: F.bold,
    lineHeight: 33,
  },
  desc: {
    color: "rgba(255,255,255,0.9)",
    fontSize: S.secondary,
    fontFamily: F.medium,
    lineHeight: 21,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginVertical: 2,
  },
  promiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promise: {
    flex: 1,
    color: "#ffffff",
    fontSize: S.caption,
    fontFamily: F.semibold,
    lineHeight: 18,
  },
  countPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  countText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 0.3,
  },
});
