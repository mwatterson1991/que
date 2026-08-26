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
        hitSlop={8}
        style={stepperStyles.btn}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
      >
        <Ionicons name="remove" size={18} color={value <= min ? "#3f3f46" : "#f5f5f7"} />
      </Pressable>
      <Text style={stepperStyles.value}>{format ? format(value) : value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        hitSlop={8}
        style={stepperStyles.btn}
        accessibilityRole="button"
        accessibilityLabel="Increase"
      >
        <Ionicons name="add" size={18} color={value >= max ? "#3f3f46" : "#f5f5f7"} />
      </Pressable>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  btn: { padding: 4 },
  value: { color: "#f5f5f7", fontSize: S.body, fontFamily: F.regular, minWidth: 28, textAlign: "center" },
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
          <Ionicons name="checkmark" size={24} color={canSave ? "#f5f5f7" : "#3f3f46"} />
        </Pressable>
      ),
    });
  }, [title, timesPerDay, factor, color, saving]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <View style={styles.row}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter habit title"
          placeholderTextColor="#52525b"
          style={styles.input}
          autoFocus
          returnKeyType="done"
        />
      </View>
      <View style={styles.sep} />

      {/* Times per day */}
      <View style={styles.row}>
        <Text style={styles.label}>Times a day</Text>
        <Stepper
          value={timesPerDay}
          min={1}
          max={10}
          onChange={setTimesPerDay}
        />
      </View>
      <View style={styles.sep} />

      {/* Factor */}
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

      {/* Color */}
      <Pressable style={styles.row} onPress={() => setShowColorPicker((v) => !v)} accessibilityRole="button" accessibilityLabel="Choose color">
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
            >
              {color === c && (
                <Ionicons name="checkmark" size={14} color="#000" />
              )}
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.sep} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#27272a",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    minHeight: 52,
  },
  label: {
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.regular,
  },
  labelGroup: {
    flex: 1,
    paddingRight: 16,
  },
  labelSub: {
    color: "#52525b",
    fontSize: S.micro,
    fontFamily: F.regular,
    marginTop: 2,
  },
  input: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.regular,
    textAlign: "right",
    marginLeft: 16,
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
    paddingVertical: 16,
    paddingHorizontal: 4,
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
});
