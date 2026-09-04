import { memo, useId } from "react";
import { View, Image, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Svg, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { Txt } from "@/components/ui";
import { C, R, SP, PRESS_OPACITY } from "@/lib/tokens";
import { artworkFor, displayTitle, displayDescription, hasAudio } from "@/lib/catalog";
import {
  CARD_W,
  CARD_H,
  WIDE_W,
  WIDE_H,
  RAIL_GAP,
  GLASS_PAD,
  Glass,
  GLASS_AVAILABLE,
  GLASS_FALLBACK,
  tapFeedback,
} from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// ─── Artwork: the one treatment every photograph gets ──────
// Twenty photographs from twenty photographers will never match on
// their own. Two layers make them one family: a uniform tone (a flat
// veil of the ground colour, so highlights sit at the same level on
// every card) and a bottom scrim (ground colour fading up from the
// foot, so the caption always lands on the same dark). Cards, channel
// cards and the player all draw through this, and nothing else.

const TONE_OPACITY = 0.16;
const SCRIM_TOP = 0.42; // scrim starts this far down the tile
const SCRIM_PEAK = 0.9; // and reaches this opacity at the foot

export function Artwork({
  uri,
  style,
  accessibilityLabel,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  // Each instance owns its gradient id so two on one screen never collide.
  const id = `scrim${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityLabel={accessibilityLabel}
      />
      <View style={styles.tone} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.bg} stopOpacity={0} />
            <Stop offset={SCRIM_TOP} stopColor={C.bg} stopOpacity={0} />
            <Stop offset="1" stopColor={C.bg} stopOpacity={SCRIM_PEAK} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// ─── The SOUND card ────────────────────────────────────────
// One recording as an artwork tile inside a Liquid Glass frame. The
// picture fills the tile, the name and one line about what you will
// hear sit on the scrim, and nothing else is drawn — except a white
// tick when it is the chosen alarm sound.

function formatDuration(sec: number) {
  const min = Math.max(1, Math.round(sec / 60));
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
  const width = wide ? WIDE_W : CARD_W;
  const height = wide ? WIDE_H : CARD_H;
  const title = displayTitle(session);
  const description = displayDescription(session);
  const playable = hasAudio(session);
  const duration = formatDuration(session.duration_sec);

  return (
    <Pressable
      disabled={!playable}
      onPress={() => {
        tapFeedback();
        onPress(session);
      }}
      style={({ pressed }) => [
        styles.frameWrap,
        { width, height },
        wide && styles.frameWide,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !playable }}
      accessibilityLabel={`${title}. ${description}. ${duration}${locked ? ", premium" : ""}${
        playable ? "" : ", coming soon"
      }${selected ? ", selected" : ""}`}
    >
      <Glass
        glassEffectStyle="clear"
        style={[styles.frame, !GLASS_AVAILABLE && GLASS_FALLBACK, selected && styles.frameSelected]}
      >
        <View style={styles.tile}>
          <Artwork uri={artworkFor(session)} />

          {selected ? (
            <View style={[styles.badge, styles.badgeSelected]}>
              <Feather name="check" size={18} color={C.bg} />
            </View>
          ) : locked ? (
            <View style={styles.badge}>
              <Feather name="lock" size={14} color={C.label} />
            </View>
          ) : null}

          <View style={styles.caption}>
            <Txt kind="headline" numberOfLines={wide ? 1 : 2} maxFontSizeMultiplier={1.25}>
              {title}
            </Txt>
            <Txt kind="footnote" tone="secondary" numberOfLines={wide ? 1 : 2} maxFontSizeMultiplier={1.25}>
              {playable ? description : `Coming soon · ${description}`}
            </Txt>
          </View>
        </View>
      </Glass>
    </Pressable>
  );
}

// Cards only re-render when something they actually draw has changed.
export default memo(SessionCard);

const styles = StyleSheet.create({
  frameWrap: {},
  frameWide: {
    marginBottom: RAIL_GAP,
  },
  pressed: {
    opacity: PRESS_OPACITY,
  },
  // The glass frame: a thin rim of glass around the picture.
  frame: {
    flex: 1,
    borderRadius: R.xl,
    padding: GLASS_PAD,
    overflow: "hidden",
  },
  frameSelected: {
    borderWidth: 2,
    borderColor: C.label,
  },
  tile: {
    flex: 1,
    borderRadius: R.xl - GLASS_PAD,
    overflow: "hidden",
    backgroundColor: C.fill,
  },
  tone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bg,
    opacity: TONE_OPACITY,
  },
  caption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: SP.lg,
    gap: 2,
  },
  badge: {
    position: "absolute",
    top: SP.md,
    right: SP.md,
    width: 30,
    height: 30,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.overlayFill,
  },
  badgeSelected: {
    backgroundColor: C.label,
  },
});
