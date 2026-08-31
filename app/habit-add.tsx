import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHabits } from "@/lib/useSupabase";
import { F, S } from "@/lib/fonts";
import AuroraBackground from "@/components/AuroraBackground";
import { Glass } from "@/components/Glass";
import { HabitIcon, iconForHabit } from "@/components/HabitIcon";

// One-tap starters — the blank input is the biggest reason people bail
const SUGGESTIONS = [
  "Drink a glass of water",
  "Get sunlight first thing",
  "Meditate 5 minutes",
  "Morning walk",
  "Read 10 pages",
  "Stretch",
  "Make the bed",
  "No phone for first hour",
];

const PRESET_COLORS = [
  "#FF6B35", // orange
  "#A855F7", // purple
  "#3B82F6", // blue
  "#22C55E", // green
  "#EC4899", // magenta
  "#06B6D4", // cyan
  "#EAB308", // yellow
  "#EF4444", // red
];

function Stepper({
  value,
  min,
  max,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <View style={stepperStyles.row}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        hitSlop={10}
        style={stepperStyles.btn}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
      >
        <Ionicons name="remove" size={18} color={value <= min ? "#6b6b73" : "#ffffff"} />
      </Pressable>
      <Text style={stepperStyles.value}>{format ? format(value) : value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        hitSlop={10}
        style={stepperStyles.btn}
        accessibilityRole="button"
        accessibilityLabel="Increase"
      >
        <Ionicons name="add" size={18} color={value >= max ? "#6b6b73" : "#ffffff"} />
      </Pressable>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  // Round pressable wells so the +/- read as controls over the aurora rather
  // than as loose glyphs floating on the card.
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  value: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.medium,
    minWidth: 34,
    textAlign: "center",
  },
});

export default function HabitAddScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { add } = useHabits();

  const [title, setTitle] = useState("");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [factor, setFactor] = useState(1);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    await add({ title: title.trim(), times_per_day: timesPerDay, factor, color });
    router.back();
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={save} disabled={!canSave} style={{ marginRight: 4, padding: 4 }} accessibilityRole="button" accessibilityLabel="Save habit" accessibilityState={{ disabled: !canSave }}>
          <Ionicons name="checkmark" size={24} color={canSave ? "#f5f5f7" : "#6b6b73"} />
        </Pressable>
      ),
    });
  }, [title, timesPerDay, factor, color, saving]);

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground dim={0.45} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Starter suggestions — each carries the icon it will actually get on
            the tracker, so picking one is a preview, not a guess. */}
        {title.trim().length === 0 && (
          <View style={styles.suggestSection}>
            <Text style={styles.sectionLabel}>Start with one of these</Text>
            <View style={styles.suggestWrap}>
              {SUGGESTIONS.map((sug) => (
                <Pressable
                  key={sug}
                  onPress={() => setTitle(sug)}
                  accessibilityRole="button"
                  accessibilityLabel={`Use suggestion: ${sug}`}
                >
                  <Glass interactive style={styles.suggestChip}>
                    <Ionicons name={iconForHabit(sug)} size={16} color={color} />
                    <Text style={styles.suggestText}>{sug}</Text>
                  </Glass>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Glass style={styles.card}>
          {/* Title — full width and left aligned, with the derived icon sitting
              beside it so the habit takes its final shape as you type. */}
          <View style={styles.titleRow}>
            <HabitIcon title={title || "new"} color={color} size={38} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Name your habit"
              placeholderTextColor="#9a9aa2"
              style={styles.titleInput}
              autoFocus
              returnKeyType="done"
              maxFontSizeMultiplier={1.4}
            />
          </View>
          <View style={styles.sep} />

          <View style={styles.row}>
            <Text style={styles.label}>Times a day</Text>
            <Stepper value={timesPerDay} min={1} max={10} onChange={setTimesPerDay} />
          </View>
          <View style={styles.sep} />

          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Text style={styles.label}>Factor</Text>
              <Text style={styles.labelSub}>Score multiplier per completion</Text>
            </View>
            <Stepper
              value={factor}
              min={1}
              max={5}
              onChange={setFactor}
              format={(v) => `${v}×`}
            />
          </View>
          <View style={styles.sep} />

          <Pressable
            style={styles.row}
            onPress={() => setShowColorPicker((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Choose color"
          >
            <Text style={styles.label}>Color</Text>
            <View style={[styles.colorDot, { backgroundColor: color }]} />
          </Pressable>

          {showColorPicker && (
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { setColor(c); setShowColorPicker(false); }}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorOptionSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${c}`}
                  accessibilityState={{ selected: color === c }}
                >
                  {color === c && <Ionicons name="checkmark" size={14} color="#000" />}
                </Pressable>
              ))}
            </View>
          )}
        </Glass>

        <Text style={styles.hint}>
          Tap the checkmark up top to save. You can remove a habit later by
          holding it on the tracker.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 48,
  },

  // Suggestions
  suggestSection: {
    marginBottom: 22,
  },
  sectionLabel: {
    color: "#c8c8d0",
    fontSize: S.micro,
    fontFamily: F.medium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  suggestWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  suggestText: {
    // Was 13pt at #e4e4e7 and it disappeared over a bright aurora blob.
    // Pure white at the secondary size holds up anywhere on the backdrop.
    color: "#ffffff",
    fontSize: S.secondary,
    fontFamily: F.medium,
  },

  // Field card
  card: {
    borderRadius: 22,
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    minHeight: 68,
  },
  titleInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.medium,
    paddingVertical: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    minHeight: 60,
  },
  label: {
    color: "#ffffff",
    fontSize: S.body,
    fontFamily: F.regular,
  },
  labelGroup: {
    flex: 1,
    paddingRight: 16,
  },
  labelSub: {
    color: "#c8c8d0",
    fontSize: S.micro,
    fontFamily: F.regular,
    marginTop: 3,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 18,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#fff",
  },

  hint: {
    color: "#a8a8b0",
    fontSize: S.caption,
    fontFamily: F.regular,
    lineHeight: 20,
    marginTop: 22,
    paddingHorizontal: 4,
  },
});
