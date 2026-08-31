import { View, Text, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import AuroraBackground from "@/components/AuroraBackground";
import { Glass } from "@/components/Glass";
import {
  BACKDROP_PRESETS,
  CUSTOM_COLORS,
  useBackdrop,
  type BackdropPreset,
} from "@/lib/backdrop";
import { F, S } from "@/lib/fonts";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// A still miniature of a preset — the same colour story the live
// backdrop draws, rendered flat so a grid of them stays cheap.
function PresetSwatch({ preset, size }: { preset: BackdropPreset; size: number }) {
  const h = size * 1.25;
  return (
    <Svg width={size} height={h}>
      <Defs>
        {preset.blobs.map((b, i) => (
          <RadialGradient key={i} id={`sw-${preset.id}-${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={b.color} stopOpacity="0.9" />
            <Stop offset="55%" stopColor={b.color} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={b.edge} stopOpacity="0" />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x="0" y="0" width={size} height={h} fill={preset.base} rx="18" />
      {preset.blobs.map((b, i) => {
        const d = size * b.sizePct;
        return (
          <Ellipse
            key={i}
            cx={size * b.xPct}
            cy={h * b.yPct}
            rx={d / 2}
            ry={d / 2}
            fill={`url(#sw-${preset.id}-${i})`}
            opacity={b.opacity ?? 1}
          />
        );
      })}
    </Svg>
  );
}

export default function BackgroundPickerScreen() {
  const { width } = useWindowDimensions();
  const {
    preset,
    presetId,
    setPresetId,
    customColors,
    setCustomColors,
    stageDark,
    setStageDark,
    windDown,
    setWindDown,
  } = useBackdrop();

  const cardW = (width - 20 * 2 - 14) / 2;

  const choose = (id: string) => {
    Haptics?.selectionAsync?.();
    setPresetId(id);
  };

  const toggleColor = (color: string) => {
    Haptics?.selectionAsync?.();
    const has = customColors.includes(color);
    let next: string[];
    if (has) {
      next = customColors.filter((c) => c !== color);
      if (next.length === 0) next = [color]; // never leave it empty
    } else {
      next = [...customColors, color].slice(-3); // keep the three most recent
    }
    setCustomColors(next);
    setPresetId("custom");
  };

  const all: BackdropPreset[] = [...BACKDROP_PRESETS];

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          The background is the room you wake up in. Pick the light.
        </Text>

        <View style={styles.grid}>
          {all.map((p) => {
            const selected = presetId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => choose(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${p.name}. ${p.description}`}
                style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <Glass scrim="strong" style={[styles.card, selected && styles.cardSelected, { width: cardW }]}>
                  <View style={styles.swatchWrap}>
                    <PresetSwatch preset={p} size={cardW - 24} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text>
                  </View>
                  {selected && (
                    <View style={styles.check}>
                      <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                    </View>
                  )}
                </Glass>
              </Pressable>
            );
          })}
        </View>

        {/* Build your own */}
        <Text style={styles.sectionTitle}>MAKE YOUR OWN</Text>
        <Glass scrim="strong" style={styles.panel}>
          <Text style={styles.panelBody}>
            Choose up to three colours. They become drifting fields of light,
            never a flat gradient.
          </Text>
          <View style={styles.colorRow}>
            {CUSTOM_COLORS.map((c) => {
              const on = presetId === "custom" && customColors.includes(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => toggleColor(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Colour ${c}${on ? ", selected" : ""}`}
                  style={[styles.colorDot, { backgroundColor: c }, on && styles.colorDotOn]}
                >
                  {on && <Ionicons name="checkmark" size={16} color="#0a0a0a" />}
                </Pressable>
              );
            })}
          </View>
          {presetId === "custom" && (
            <View style={styles.previewWrap}>
              <PresetSwatch preset={preset} size={width - 40 - 32} />
            </View>
          )}
        </Glass>

        {/* Lighting */}
        <Text style={styles.sectionTitle}>LIGHTING</Text>
        <Glass scrim="strong" style={styles.panel}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Wind down</Text>
              <Text style={styles.toggleDesc}>
                The light fades on its own the longer you stay, easing you toward sleep.
              </Text>
            </View>
            <Switch
              value={windDown}
              onValueChange={(v) => { Haptics?.selectionAsync?.(); setWindDown(v); }}
              trackColor={{ true: "#34C759", false: "rgba(255,255,255,0.2)" }}
              accessibilityLabel="Wind down"
            />
          </View>
          <View style={styles.panelSep} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Lights out</Text>
              <Text style={styles.toggleDesc}>
                Take the house lights all the way down to black.
              </Text>
            </View>
            <Switch
              value={stageDark}
              onValueChange={(v) => { Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Soft); setStageDark(v); }}
              trackColor={{ true: "#34C759", false: "rgba(255,255,255,0.2)" }}
              accessibilityLabel="Lights out"
            />
          </View>
        </Glass>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020805" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  lead: {
    color: "#f5f5f7",
    fontSize: S.secondary,
    fontFamily: F.regular,
    lineHeight: 23,
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 12,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  swatchWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  cardText: { paddingTop: 10, paddingHorizontal: 2 },
  cardName: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.semibold,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.72)",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 2,
    lineHeight: 17,
  },
  check: { position: "absolute", top: 18, right: 18 },
  sectionTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 10,
  },
  panel: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
  },
  panelBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: S.caption,
    fontFamily: F.regular,
    lineHeight: 19,
    marginBottom: 14,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotOn: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  previewWrap: {
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  toggleText: { flex: 1 },
  toggleLabel: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.medium,
  },
  toggleDesc: {
    color: "rgba(255,255,255,0.68)",
    fontSize: S.caption,
    fontFamily: F.regular,
    lineHeight: 17,
    marginTop: 2,
  },
  panelSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 14,
  },
});
