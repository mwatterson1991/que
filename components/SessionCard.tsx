import { memo } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { Glass, TEXT_ON_IMAGE } from "@/components/Glass";
import { artworkFor, channelFor } from "@/lib/catalog";
import FrequencyWave, { waveKindFor } from "@/components/FrequencyWave";
import {
  CARD_W,
  CARD_H,
  WIDE_W,
  WIDE_H,
  phaseFor,
  tapFeedback,
  toneFor,
} from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The SOUND card: one recording, held in a single clear pane of glass.
//
// Modelled on the players Michael keeps sending: one panel, a piece of
// artwork, a big title, one line underneath, and a lot of nothing. The
// old card was a photograph with a second sheet of glass plated over
// the bottom of it — two glass surfaces and four pieces of text on a
// 300pt card. Everything that wasn't the artwork, the title or the one
// meta line has gone.
//
// The panel is CLEAR. Its colour is a translucent wash of the channel's
// hue (see toneFor) and its legibility comes from a tight gradient
// under the text, not from fogging the whole card.

function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

/**
 * The gradient that sits under a text block — and ONLY under the text
 * block. It starts as the channel's own colour at almost nothing, so
 * the lift reads as the card's light deepening rather than as a grey
 * box, and lands on near-black where the words actually are.
 */
export function TextScrim({
  id,
  height,
  accent,
}: {
  id: string;
  height: number | string;
  accent?: string;
}) {
  const tint = accent ?? "#000105";
  return (
    <View style={[styles.scrim, { height: height as any }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={tint} stopOpacity="0" />
            <Stop offset="46%" stopColor={tint} stopOpacity="0.1" />
            <Stop offset="74%" stopColor="#000105" stopOpacity="0.46" />
            <Stop offset="100%" stopColor="#000105" stopOpacity="0.72" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function SessionCard({
  session,
  variant = "rail",
  index = 0,
  selected,
  locked,
  light = 1,
  onPress,
}: {
  session: Session;
  variant?: "rail" | "wide";
  /** Position in its rail — only used to offset the glass shimmer. */
  index?: number;
  selected?: boolean;
  locked?: boolean;
  /** House-lights level (0–1) from the backdrop; scales the tint. */
  light?: number;
  onPress: (session: Session) => void;
}) {
  const wide = variant === "wide";
  // A frequency's honest portrait is its own waveform, not a photograph.
  const wave = waveKindFor(session.title);
  const width = wide ? WIDE_W : CARD_W;
  const height = wide ? WIDE_H : CARD_H;
  const duration = formatDuration(session.duration_sec);
  const phase = phaseFor(index);
  const tone = toneFor(channelFor(session), light);

  // Explicit numbers rather than percentages: FrequencyWave draws an SVG
  // and needs to be told its box.
  // 0.56 of the card is picture; the title and meta take ~75 at the
  // bottom; everything between is deliberately empty. On a 6.1" phone
  // that's ~125pt of clear glass with the gradient moving through it,
  // which is the whole gesture of the reference players.
  const artW = wide ? WIDE_H - 26 : CARD_W - 20;
  const artH = wide ? WIDE_H - 26 : Math.round(CARD_H * 0.56);

  const art = (
    <View
      style={[
        styles.art,
        { width: artW, height: artH, backgroundColor: tone.well, borderColor: tone.edge },
      ]}
    >
      {wave ? (
        <View style={styles.waveWrap}>
          <FrequencyWave kind={wave} width={artW} height={Math.round(artH * 0.52)} />
        </View>
      ) : (
        <Image
          source={{ uri: artworkFor(session) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {selected && (
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={26} color="#f5f5f7" />
        </View>
      )}
      {locked && !selected && (
        <View style={[styles.badge, styles.lockBadge]}>
          <Ionicons name="lock-closed" size={14} color="#f5f5f7" />
        </View>
      )}
    </View>
  );

  const caption = (
    <View style={[styles.caption, wide && styles.captionWide]}>
      <TextScrim
        id={`sound-${session.id}`}
        height={wide ? "100%" : "88%"}
        accent={tone.accent}
      />
      <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.25}>
        {session.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.25}>
        {duration} · {session.category}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress(session);
      }}
      style={({ pressed }) => [
        { width, height },
        wide && styles.wideSpacing,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={selected !== undefined ? { selected } : undefined}
      accessibilityLabel={`${session.title}. ${session.category}, ${duration}${
        locked ? ", premium" : ""
      }`}
    >
      {/* One pane of glass for the whole card. Its prismatic rim outlines
          the card and the sheen travels the border, out of phase with
          its neighbours. scrim="none" — the gradient shows through. */}
      <Glass
        liquid
        phase={phase}
        scrim="none"
        style={[
          styles.frame,
          wide && styles.frameWide,
          { borderColor: tone.edge },
          selected && styles.frameSelected,
        ]}
      >
        {/* The channel's colour, held INSIDE the glass. */}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: tone.wash }]}
          pointerEvents="none"
        />
        {art}
        {caption}
      </Glass>
    </Pressable>
  );
}

// The rails re-render whenever the house lights step down. Cards only
// need to follow when something they actually draw has changed.
export default memo(SessionCard);

const styles = StyleSheet.create({
  waveWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
  },
  wideSpacing: {
    marginBottom: 14,
  },

  // The single panel. Generous radius, generous padding, and the
  // artwork inset inside it rather than bleeding to the edges — the
  // card is a piece of glass HOLDING a picture, not a cropped picture.
  frame: {
    flex: 1,
    borderRadius: 34,
    padding: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  frameWide: {
    borderRadius: 28,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  frameSelected: {
    borderWidth: 2,
    borderColor: "#f5f5f7",
  },
  art: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Everything below the artwork. The title and meta are pinned to the
  // bottom, so whatever height is left over becomes air — which is the
  // whole point of the reference players.
  caption: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  captionWide: {
    justifyContent: "center",
    paddingLeft: 16,
    paddingRight: 4,
    paddingBottom: 0,
  },

  scrim: {
    position: "absolute",
    left: -14,
    right: -14,
    bottom: -14,
  },

  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  lockBadge: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  // The card now carries the big type on this screen: the rail label
  // above it is a quiet section marker, so the title is free to be the
  // thing you actually read.
  title: {
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: F.bold,
    lineHeight: 27,
    letterSpacing: -0.3,
    ...TEXT_ON_IMAGE,
  },
  // One line. Duration and channel, nothing else.
  meta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: S.caption,
    fontFamily: F.medium,
    marginTop: 6,
    ...TEXT_ON_IMAGE,
  },
});
