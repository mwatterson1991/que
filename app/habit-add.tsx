import { useEffect, useRef, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHabits } from "@/lib/useSupabase";
import { PRESET_COLORS } from "@/lib/habitColors";
import { setReminder, clearReminder, getReminder, reminderTimes } from "@/lib/habitReminders";
import { HabitIcon, iconForHabit } from "@/components/HabitIcon";
import { WheelColumn, WheelHighlight, HOURS, MINUTES, MERIDIEM } from "@/components/TimeWheel";
import { Screen, Section, Row, Field, Button, IconButton, Toggle, Icon, Txt } from "@/components/ui";
import { C, SP, R, PRESS_OPACITY } from "@/lib/tokens";

// Three short steps instead of one long list: what, when, how it looks.
const STEPS = ["What", "When", "Look"] as const;

// One-tap starters, each with the schedule that works best for it. The
// blank input is the biggest reason people bail, so picking one fills the
// name and moves straight on to When.
type Starter = { title: string; times: number; hour: number; minute: number; remind: boolean };

const STARTERS: Starter[] = [
  { title: "Drink a glass of water", times: 3, hour: 8, minute: 0, remind: true },
  { title: "Get sunlight first thing", times: 1, hour: 7, minute: 30, remind: true },
  { title: "Meditate 5 minutes", times: 1, hour: 7, minute: 0, remind: true },
  { title: "Morning walk", times: 1, hour: 8, minute: 0, remind: true },
  { title: "Read 10 pages", times: 1, hour: 21, minute: 0, remind: true },
  { title: "Stretch", times: 1, hour: 7, minute: 15, remind: true },
  { title: "Make the bed", times: 1, hour: 7, minute: 10, remind: true },
  { title: "No phone for first hour", times: 1, hour: 8, minute: 0, remind: false },
];

/** Anything typed by hand. */
const HAND_TYPED: Omit<Starter, "title"> = { times: 1, hour: 8, minute: 0, remind: true };

const SEGMENTS = [1, 2, 3];
const MAX_TIMES = 10;

const COL_W = 64;
const COLON_W = 16;
// Three columns, the colon, and the gaps between them.
const WHEEL_W = COL_W * 3 + COLON_W + SP.sm * 3;
const CHIP = 36;
const PREVIEW_ICON = 44;

// 24 hour clock to wheel indices and back.
const toWheel = (hour: number) => ({ hourIdx: (hour % 12 || 12) - 1, merIdx: hour >= 12 ? 1 : 0 });
const fromWheel = (hourIdx: number, merIdx: number) => ((hourIdx + 1) % 12) + merIdx * 12;

const clockLabel = (hour: number, minute: number) =>
  `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;

const timesLabel = (n: number) => (n === 1 ? "Once a day" : n === 2 ? "Twice a day" : `${n} times a day`);

/** One choice in the times a day control: white when chosen, like the accent everywhere else. */
function Segment({ label, on, onPress, accessibilityLabel }: { label: string; on: boolean; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.segment, on && styles.segmentOn, pressed && { opacity: PRESS_OPACITY }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: on }}
    >
      <Txt kind="headline" tone={on ? "onAccent" : "primary"}>{label}</Txt>
    </Pressable>
  );
}

export default function HabitAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = typeof idParam === "string" && idParam.length > 0 ? idParam : undefined;
  const { habits, add, update } = useHabits();
  const editing = !!id;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [timesPerDay, setTimesPerDay] = useState(HAND_TYPED.times);
  const [remind, setRemind] = useState(HAND_TYPED.remind);
  const [hourIdx, setHourIdx] = useState(toWheel(HAND_TYPED.hour).hourIdx);
  const [minIdx, setMinIdx] = useState(HAND_TYPED.minute);
  const [merIdx, setMerIdx] = useState(toWheel(HAND_TYPED.hour).merIdx);
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const applyTime = (hour: number, minute: number) => {
    const w = toWheel(hour);
    setHourIdx(w.hourIdx);
    setMerIdx(w.merIdx);
    setMinIdx(minute);
  };

  // Edit mode: fill the form once from the stored habit and its reminder.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!id || hydrated.current) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    hydrated.current = true;
    setTitle(habit.title);
    setTimesPerDay(habit.times_per_day);
    setColor(habit.color);
    getReminder(habit.id).then((r) => {
      setRemind(!!r);
      if (r) applyTime(r.hour, r.minute);
    });
    // applyTime is a plain setter bundle; it never changes meaning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, habits]);

  const pickStarter = (s: Starter) => {
    setTitle(s.title);
    setTimesPerDay(s.times);
    setRemind(s.remind);
    applyTime(s.hour, s.minute);
    goTo(1);
  };

  const goTo = (next: number) => {
    Keyboard.dismiss();
    setStep(Math.max(0, Math.min(next, STEPS.length - 1)));
  };

  const hour = fromWheel(hourIdx, merIdx);
  const name = title.trim();
  const canNext = name.length > 0;
  const canSave = canNext && !saving;
  const last = step === STEPS.length - 1;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    let habitId = id;
    if (id) {
      await update(id, { title: name, times_per_day: timesPerDay, color });
    } else {
      const res = await add({ title: name, times_per_day: timesPerDay, factor: 1, color });
      habitId = res?.data?.id;
    }
    if (habitId) {
      if (remind) await setReminder(habitId, { title: name, hour, minute: minIdx, timesPerDay });
      else await clearReminder(habitId);
    }
    router.back();
  };

  // The reminder times a multi-a-day habit will get, for the footer.
  const times = reminderTimes({ hour, minute: minIdx, timesPerDay });
  const reminderFooter = !remind
    ? "You can turn this on later."
    : times.length > 1
      ? `Then every 3 hours: ${times.slice(1).map((t) => clockLabel(t.hour, t.minute)).join(", ")}.`
      : undefined;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: editing ? "Edit Habit" : "New Habit",
          headerLeft: () => <IconButton icon="x" label="Close" onPress={() => router.back()} />,
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepHead}>
            <Txt kind="footnote" tone="secondary">{`${step + 1} of ${STEPS.length}`}</Txt>
            <Txt kind="title2">{STEPS[step]}</Txt>
          </View>

          {step === 0 && (
            <>
              <Field
                value={title}
                onChangeText={setTitle}
                placeholder="Name your habit"
                autoFocus={!editing}
                returnKeyType="next"
                onSubmitEditing={() => canNext && goTo(1)}
                maxFontSizeMultiplier={1.4}
                accessibilityLabel="Habit name"
                style={styles.field}
              />
              <Section header="Or start with one of these">
                {STARTERS.map((s) => (
                  <Row
                    key={s.title}
                    title={s.title}
                    icon={iconForHabit(s.title)}
                    iconColor={C.label}
                    accessory="none"
                    onPress={() => pickStarter(s)}
                    accessibilityLabel={`Use suggestion: ${s.title}`}
                  />
                ))}
              </Section>
            </>
          )}

          {step === 1 && (
            <>
              <Section header="How many times a day">
                <View style={styles.segments} accessibilityLabel={timesLabel(timesPerDay)}>
                  {SEGMENTS.map((n) => (
                    <Segment
                      key={n}
                      label={String(n)}
                      on={timesPerDay === n}
                      onPress={() => setTimesPerDay(n)}
                      accessibilityLabel={timesLabel(n)}
                    />
                  ))}
                  {/* More than three: the plus shows the count and keeps counting. */}
                  <Segment
                    label={timesPerDay > SEGMENTS.length ? String(timesPerDay) : "+"}
                    on={timesPerDay > SEGMENTS.length}
                    onPress={() => setTimesPerDay(Math.min(MAX_TIMES, Math.max(SEGMENTS.length, timesPerDay) + 1))}
                    accessibilityLabel="More times a day"
                  />
                </View>
              </Section>

              <Section header="Reminder" footer={reminderFooter}>
                <Row
                  title="Remind me"
                  right={<Toggle value={remind} onValueChange={setRemind} accessibilityLabel="Remind me" />}
                />
                {remind ? (
                  <View style={styles.wheelWrap} accessible accessibilityLabel="Reminder time">
                    <WheelHighlight width={WHEEL_W} />
                    <View style={styles.wheelColumns}>
                      <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={COL_W} label="Hour" />
                      <Txt kind="picker" style={styles.colon}>:</Txt>
                      <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={COL_W} label="Minute" />
                      <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={COL_W} label="AM or PM" />
                    </View>
                  </View>
                ) : null}
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              {/* The habit as it will sit on the tracker and the graph. */}
              <View style={styles.preview}>
                <HabitIcon title={name || "new"} color={color} size={PREVIEW_ICON} />
                <Txt kind="title3" numberOfLines={1}>{name}</Txt>
              </View>
              <Section header="Colour" footer="Your colour on the tracker and the Progress graph.">
                <View style={styles.chips}>
                  {PRESET_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: c },
                        color === c && styles.chipOn,
                        pressed && { opacity: PRESS_OPACITY },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Color ${c}`}
                      accessibilityState={{ selected: color === c }}
                    >
                      {color === c && <Icon name="check" size={16} color={C.onAccent} />}
                    </Pressable>
                  ))}
                </View>
              </Section>
            </>
          )}
        </ScrollView>

        {/* Next and Back live at the bottom, where the thumb already is. */}
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, SP.lg) }]}>
          {step > 0 && (
            <Button tone="gray" title="Back" onPress={() => goTo(step - 1)} style={styles.flex} />
          )}
          {last ? (
            <Button title="Save" onPress={save} disabled={!canSave} style={styles.flex} />
          ) : (
            <Button title="Next" onPress={() => goTo(step + 1)} disabled={!canNext} style={styles.flex} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: SP.xxl,
  },
  stepHead: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.lg,
    gap: SP.xs,
  },
  field: {
    marginHorizontal: SP.screen,
    marginTop: SP.lg,
  },
  segments: {
    flexDirection: "row",
    gap: SP.sm,
    marginHorizontal: SP.screen,
    marginVertical: SP.md,
  },
  segment: {
    flex: 1,
    minHeight: SP.field,
    borderRadius: R.field,
    backgroundColor: C.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentOn: {
    backgroundColor: C.accent,
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SP.lg,
  },
  wheelColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
  },
  colon: {
    width: COLON_W,
    textAlign: "center",
    marginBottom: 2,
  },
  preview: {
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.screen,
    paddingTop: SP.xxl,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SP.md,
    paddingHorizontal: SP.screen,
    paddingVertical: SP.md,
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: R.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: {
    borderWidth: 3,
    borderColor: C.label,
  },
  bar: {
    flexDirection: "row",
    gap: SP.md,
    paddingHorizontal: SP.screen,
    paddingTop: SP.md,
    backgroundColor: C.bg,
  },
});
