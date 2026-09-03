import { useState } from "react";
import { View, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHabits } from "@/lib/useSupabase";
import { PRESET_COLORS } from "@/lib/habitColors";
import { HabitIcon, iconForHabit } from "@/components/HabitIcon";
import { Screen, Section, Row, IconButton } from "@/components/ui";
import { C, SP, R, TYPE, PRESS_OPACITY } from "@/lib/tokens";

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

const TIMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const FACTORS = [1, 2, 3, 4, 5];

const timesLabel = (n: number) => (n === 1 ? "Once a day" : n === 2 ? "Twice a day" : `${n} times a day`);

// The selection tick on the right of a list row (Settings › Sounds style).
function Check({ on }: { on: boolean }) {
  return <View style={styles.check}>{on && <Ionicons name="checkmark" size={22} color={C.accent} />}</View>;
}

export default function HabitAddScreen() {
  const router = useRouter();
  const { add } = useHabits();

  const [title, setTitle] = useState("");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [factor, setFactor] = useState(1);
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    await add({ title: title.trim(), times_per_day: timesPerDay, factor, color });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton icon="checkmark" label="Save habit" disabled={!canSave} onPress={save} />,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name — the derived icon sits beside it so the habit takes its
            final shape as you type. */}
        <Section header="Name">
          <View style={styles.nameRow}>
            <HabitIcon title={title || "new"} color={color} size={SP.xxl} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Name your habit"
              placeholderTextColor={C.labelTertiary}
              selectionColor={C.accent}
              style={[TYPE.body, styles.input]}
              autoFocus
              returnKeyType="done"
              maxFontSizeMultiplier={1.4}
              accessibilityLabel="Habit name"
            />
          </View>
        </Section>

        {/* Starter suggestions — each carries the icon it will actually get on
            the tracker, so picking one is a preview, not a guess. */}
        {title.trim().length === 0 && (
          <Section header="Start with one of these">
            {SUGGESTIONS.map((sug) => (
              <Row
                key={sug}
                icon={iconForHabit(sug)}
                iconColor={color}
                title={sug}
                accessory="none"
                onPress={() => setTitle(sug)}
                accessibilityLabel={`Use suggestion: ${sug}`}
              />
            ))}
          </Section>
        )}

        <Section header="Times a day">
          {TIMES.map((n) => (
            <Row
              key={n}
              title={timesLabel(n)}
              accessory={<Check on={timesPerDay === n} />}
              onPress={() => setTimesPerDay(n)}
              accessibilityLabel={`${timesLabel(n)}${timesPerDay === n ? ", selected" : ""}`}
            />
          ))}
        </Section>

        <Section header="Factor" footer="Score multiplier per completion.">
          {FACTORS.map((n) => (
            <Row
              key={n}
              title={`${n}×`}
              accessory={<Check on={factor === n} />}
              onPress={() => setFactor(n)}
              accessibilityLabel={`Factor ${n}${factor === n ? ", selected" : ""}`}
            />
          ))}
        </Section>

        <Section
          header="Color"
          footer="Tap the checkmark up top to save. You can remove a habit later by holding it on the tracker."
        >
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={({ pressed }) => [
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorOptionSelected,
                  pressed && { opacity: PRESS_OPACITY },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected: color === c }}
              >
                {color === c && <Ionicons name="checkmark" size={16} color={C.onAccent} />}
              </Pressable>
            ))}
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    minHeight: SP.row,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
    backgroundColor: C.fill,
  },
  input: {
    flex: 1,
    color: C.label,
    paddingVertical: 0,
  },
  check: {
    width: SP.xxl,
    alignItems: "flex-end",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP.md,
    padding: SP.lg,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: C.label,
  },
});
