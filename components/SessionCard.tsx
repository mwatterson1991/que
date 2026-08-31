import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { Glass } from "@/components/Glass";
import { artworkFor } from "@/lib/catalog";
import FrequencyWave, { waveKindFor } from "@/components/FrequencyWave";
import { CARD_W, CARD_H, WIDE_W, WIDE_H, phaseFor, tapFeedback } from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The SOUND card: one recording, one dominant macro photograph, held in
// a liquid-glass frame. Image-forward and cinematic — the opposite of
// the ChannelCard, which is text-forward glass over one blurred photo.
// The two must never be confused at a glance.
//
// Type hierarchy: the RAIL heading is the H1 of the screen. A card
// title is a caption on a photograph, so it sits two steps down the
// scale (body vs heading) and never competes with the rail above it.

function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

/** Bottom-anchored black gradient. Text never sits on bare photography —
 * artwork is unpredictable, so legibility gets its own layer. */
export function Scrim({ id, height }: { id: string; height: number | string }) {
  return (
    <View style={[styles.scrim, { height: height as any }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <Stop offset="42%" stopColor="#000000" stopOpacity="0.38" />
            <Stop offset="72%" stopColor="#000000" stopOpacity="0.72" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.92" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export default function SessionCard({
  session,
  variant = "rail",
  index = 0,
  selected,
  locked,
  onPress,
}: {
  session: Session;
  variant?: "rail" | "wide";
  /** Position in its rail — only used to offset the glass shimmer. */
  index?: number;
  selected?: boolean;
  locked?: boolean;
  onPress: (session: Session) => void;
}) {
  const wide = variant === "wide";
  // A frequency's honest portrait is its own waveform, not a photograph.
  const wave = waveKindFor(session.title);
  const width = wide ? WIDE_W : CARD_W;
  const height = wide ? WIDE_H : CARD_H;
  const duration = formatDuration(session.duration_sec);
  const phase = phaseFor(index);

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
      {/* The frame is the glass: its prismatic rim outlines the whole
          card and the sheen travels the border, out of phase with its
          neighbours. */}
      <Glass
        liquid
        phase={phase}
        scrim="none"
        style={[styles.frame, selected && styles.frameSelected]}
      >
        <View style={styles.art}>
          {wave ? (
            <View style={styles.waveWrap}>
              <FrequencyWave kind={wave} width={width} height={height * 0.46} />
            </View>
          ) : (
            <Image
              source={{ uri: artworkFor(session) }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}

          <Scrim id={`sound-${session.id}`} height="58%" />

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

          {/* Label plate: a second, quieter pane of glass laid on the
              photograph. Keeps the caption legible over any artwork
              without a heavier gradient eating the image. */}
          <Glass scrim="soft" style={styles.plate} pointerEvents="none">
            <Text
              style={[styles.title, wide && styles.titleWide]}
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {session.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta} maxFontSizeMultiplier={1.3}>
                {duration}
              </Text>
              <View style={styles.metaDot} />
              <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {session.category}
              </Text>
            </View>
          </Glass>
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  waveWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05070c",
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
  },
  wideSpacing: {
    marginBottom: 18,
  },

  // Glass frame: a thin liquid-glass edge all the way around the photo,
  // so the card reads as a pane of glass holding an image.
  frame: {
    flex: 1,
    borderRadius: 30,
    padding: 6,
    overflow: "hidden",
  },
  frameSelected: {
    borderWidth: 2,
    borderColor: "#f5f5f7",
  },
  art: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#12130f",
  },

  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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

  plate: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  // Two steps below the rail heading (28) — a caption on a photograph,
  // not a second headline.
  title: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
    lineHeight: 22,
    marginBottom: 4,
  },
  // Search results have no rail heading above them, so the title is
  // free to carry the row.
  titleWide: {
    fontSize: S.title,
    fontFamily: F.bold,
    lineHeight: 27,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  meta: {
    color: "rgba(255,255,255,0.88)",
    fontSize: S.caption,
    fontFamily: F.semibold,
    flexShrink: 1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginHorizontal: 8,
  },
});
