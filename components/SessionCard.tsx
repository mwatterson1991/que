import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { Glass } from "@/components/Glass";
import { artworkFor } from "@/lib/catalog";
import { CARD_W, CARD_H, WIDE_W, WIDE_H, tapFeedback } from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The SOUND card: one recording, one dominant macro photograph, held in
// a liquid-glass frame. Image-forward and cinematic — the opposite of
// the ChannelCard, which is text-forward glass over a blurred collage.
// The two must never be confused at a glance.

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
  selected,
  locked,
  onPress,
}: {
  session: Session;
  variant?: "rail" | "wide";
  selected?: boolean;
  locked?: boolean;
  onPress: (session: Session) => void;
}) {
  const wide = variant === "wide";
  const width = wide ? WIDE_W : CARD_W;
  const height = wide ? WIDE_H : CARD_H;
  const duration = formatDuration(session.duration_sec);

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
      <Glass style={[styles.frame, selected && styles.frameSelected]}>
        <View style={styles.art}>
          <Image
            source={{ uri: artworkFor(session) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          <Scrim id={`sound-${session.id}`} height="62%" />

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

          <View style={styles.copy}>
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
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    padding: 5,
    overflow: "hidden",
  },
  frameSelected: {
    borderWidth: 2,
    borderColor: "#f5f5f7",
  },
  art: {
    flex: 1,
    borderRadius: 25,
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

  copy: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  title: {
    color: "#ffffff",
    fontSize: S.title,
    fontFamily: F.bold,
    lineHeight: 27,
    marginBottom: 6,
  },
  titleWide: {
    fontSize: S.heading,
    lineHeight: 33,
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
