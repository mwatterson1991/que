import { memo } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { artworkFor } from "@/lib/catalog";
import FrequencyWave, { waveKindFor } from "@/components/FrequencyWave";
import { CARD_W, CARD_H, WIDE_W, WIDE_H, RAIL_GAP, tapFeedback } from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// The SOUND card: one recording as a full-bleed artwork tile. The
// picture fills the tile edge to edge, the title and one meta line sit
// on a flat scrim along the bottom, and nothing else is drawn.

function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

function SessionCard({
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
  // A frequency's honest portrait is its own waveform, not a photograph.
  const wave = waveKindFor(session.title);
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
        styles.tile,
        { width, height },
        wide && styles.tileWide,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={selected !== undefined ? { selected } : undefined}
      accessibilityLabel={`${session.title}. ${session.category}, ${duration}${
        locked ? ", premium" : ""
      }`}
    >
      {wave ? (
        <View style={styles.waveWrap}>
          <FrequencyWave kind={wave} width={width} height={Math.round(height * (wide ? 0.36 : 0.5))} />
        </View>
      ) : (
        <Image
          source={{ uri: artworkFor(session) }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {selected && (
        <View style={[styles.badge, styles.badgeSelected]}>
          <Ionicons name="checkmark" size={18} color={C.onAccent} />
        </View>
      )}
      {locked && !selected && (
        <View style={styles.badge}>
          <Ionicons name="lock-closed" size={14} color={C.label} />
        </View>
      )}

      <View style={styles.caption}>
        <Txt kind="headline" numberOfLines={wide ? 1 : 2} maxFontSizeMultiplier={1.25}>
          {session.title}
        </Txt>
        <Txt kind="footnote" tone="secondary" numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {duration} · {session.category}
        </Txt>
      </View>
    </Pressable>
  );
}

// Cards only re-render when something they actually draw has changed.
export default memo(SessionCard);

const styles = StyleSheet.create({
  tile: {
    borderRadius: R.xl,
    overflow: "hidden",
    backgroundColor: C.fill,
  },
  tileWide: {
    marginBottom: RAIL_GAP,
  },
  pressed: {
    opacity: PRESS_OPACITY,
  },
  waveWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: SP.xxl,
  },
  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SP.lg,
    backgroundColor: C.scrim,
  },
  badge: {
    position: "absolute",
    top: SP.md,
    right: SP.md,
    width: 28,
    height: 28,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.overlayFill,
  },
  badgeSelected: {
    backgroundColor: C.accent,
  },
});
