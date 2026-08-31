import { View, Text, Image, StyleSheet, useWindowDimensions, Pressable, ScrollView } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Svg, { Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { GlassView, GlassContainer, isLiquidGlassAvailable } from "expo-glass-effect";
import { F, S } from "@/lib/fonts";

/**
 * glass-lab.tsx — a controlled test, not a product screen.
 *
 * The thing that finally clicked: refraction is only VISIBLE when there
 * is structure behind the glass to distort. Bending a smooth gradient
 * produces a smooth gradient — nothing to see. Every reference we're
 * chasing puts the panel over high-frequency detail (ocean foam, a hard
 * gradient boundary, contour lines), and the "stretch" is those lines
 * being displaced near the panel's inner edge.
 *
 * So: churning ocean underneath, and three panels over it —
 *   A. the native material, completely bare
 *   B. the native material with the edge-magnification trick underneath
 *   C. a merged cluster, to see the gooey join
 * Whatever wins here becomes the app's Glass component.
 */

const ART = "https://images.pexels.com/photos/31216830/pexels-photo-31216830.jpeg?auto=compress&cs=tinysrgb&w=600";

// Deterministic bars, dense enough to read as a waveform
const BARS = Array.from({ length: 58 }, (_, i) => {
  const x = Math.sin(i * 0.7) * Math.cos(i * 0.31) * Math.sin(i * 0.13 + 1.2);
  return 0.28 + Math.abs(x) * 0.72;
});

function Waveform({ width, height, progress }: { width: number; height: number; progress: number }) {
  const gap = 2.6;
  const bw = (width - gap * (BARS.length - 1)) / BARS.length;
  return (
    <Svg width={width} height={height}>
      {BARS.map((v, i) => {
        const h = Math.max(3, v * height);
        const played = i / BARS.length <= progress;
        return (
          <Rect
            key={i}
            x={i * (bw + gap)}
            y={(height - h) / 2}
            width={bw}
            height={h}
            rx={bw / 2}
            fill="#ffffff"
            fillOpacity={played ? 0.98 : 0.42}
          />
        );
      })}
    </Svg>
  );
}

function PlayerBody({ w }: { w: number }) {
  return (
    <>
      <View style={styles.headRow}>
        <Image source={{ uri: ART }} style={styles.art} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>Tideline</Text>
          <Text style={styles.artist} numberOfLines={1}>Morning Que</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.time}>01:20</Text>
        <Text style={styles.time}>04:41</Text>
      </View>
      <Waveform width={w - 56} height={34} progress={0.36} />
    </>
  );
}

export default function GlassLabScreen() {
  const { width, height } = useWindowDimensions();
  const cardW = width - 36;

  const player = useVideoPlayer(require("../assets/video/ocean.mp4"), (p) => {
    p.loop = true;
    p.muted = true;
    // Slow motion: the stretch is easiest to read when the lines move slowly
    p.playbackRate = 0.5;
    p.play();
  });

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { minHeight: height }]}>
        <Text style={styles.lab}>A · bare material</Text>
        <GlassView glassEffectStyle="clear" isInteractive style={[styles.card, { width: cardW }]}>
          <PlayerBody w={cardW} />
          <View style={styles.transport}>
            <GlassView glassEffectStyle="clear" isInteractive style={styles.btn}>
              <Ionicons name="play-skip-back" size={20} color="#fff" />
            </GlassView>
            <GlassView glassEffectStyle="clear" isInteractive style={[styles.btn, styles.btnMain]}>
              <Ionicons name="play" size={26} color="#fff" />
            </GlassView>
            <GlassView glassEffectStyle="clear" isInteractive style={styles.btn}>
              <Ionicons name="play-skip-forward" size={20} color="#fff" />
            </GlassView>
          </View>
        </GlassView>

        <Text style={styles.lab}>B · with edge magnification underneath</Text>
        <View style={[styles.card, styles.cardHost, { width: cardW }]}>
          {/* A second copy of the same video, scaled up inside the card's
              bounds. At the centre it lines up with the real background;
              toward the edges it diverges, which IS the stretch — the
              lines behind the panel pulled outward near its border. */}
          <View style={styles.lens} pointerEvents="none">
            <VideoView
              player={player}
              style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.22 }] }]}
              contentFit="cover"
              nativeControls={false}
            />
          </View>
          <GlassView glassEffectStyle="clear" isInteractive style={StyleSheet.absoluteFill} />
          <View style={styles.cardInner}>
            <PlayerBody w={cardW} />
          </View>
        </View>

        <Text style={styles.lab}>C · merged cluster (gooey join)</Text>
        <GlassContainer spacing={26} style={styles.cluster}>
          <GlassView glassEffectStyle="clear" isInteractive style={styles.btn}>
            <Ionicons name="shuffle" size={20} color="#fff" />
          </GlassView>
          <GlassView glassEffectStyle="clear" isInteractive style={[styles.btn, styles.btnMain]}>
            <Ionicons name="pause" size={26} color="#fff" />
          </GlassView>
          <GlassView glassEffectStyle="clear" isInteractive style={styles.btn}>
            <Ionicons name="repeat" size={20} color="#fff" />
          </GlassView>
        </GlassContainer>

        <Text style={styles.note}>
          liquid glass available: {String(isLiquidGlassAvailable())}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#04121a" },
  scroll: { padding: 18, paddingTop: 70, gap: 12, alignItems: "center" },
  lab: {
    alignSelf: "flex-start",
    color: "rgba(255,255,255,0.9)",
    fontSize: S.caption,
    fontFamily: F.semibold,
    letterSpacing: 0.6,
    marginTop: 10,
  },
  card: {
    borderRadius: 34,
    padding: 20,
    gap: 12,
  },
  cardHost: {
    overflow: "hidden",
  },
  cardInner: { gap: 12 },
  lens: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: "hidden",
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  art: { width: 86, height: 86, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)" },
  title: { color: "#fff", fontSize: 34, fontFamily: F.bold, letterSpacing: -0.5 },
  artist: { color: "rgba(255,255,255,0.82)", fontSize: S.body, fontFamily: F.regular, marginTop: 2 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  time: { color: "rgba(255,255,255,0.88)", fontSize: S.caption, fontFamily: F.medium },
  transport: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 22, marginTop: 8 },
  btn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  btnMain: { width: 74, height: 74, borderRadius: 37 },
  cluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 6,
  },
  note: { color: "rgba(255,255,255,0.7)", fontSize: S.caption, marginTop: 18 },
});
