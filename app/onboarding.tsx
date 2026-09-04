/**
 * onboarding.tsx
 *
 * Multi-step onboarding flow shown to first-time users after account creation.
 * State machine (not a nested navigator) — all steps live in one screen.
 *
 * Steps:
 *   0 – Goal selection
 *   1 – Wake time picker  (creates first alarm)
 *   2 – Notification permission
 *   3 – Completion / launch
 *
 * On "Start Que" (step 3): marks user_metadata.onboarded = true,
 * schedules the alarm, then navigates to /alarms.
 */

import { useState, useRef } from "react";
import { View, ScrollView, StyleSheet, Animated, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAlarms } from "@/lib/useSupabase";
import { scheduleAlarm, requestAlarmPermissions } from "@/lib/alarmScheduler";
import { WheelColumn, WheelHighlight, HOURS, MINUTES, MERIDIEM } from "@/components/TimeWheel";
import { Screen, Txt, Section, Row, Button, IconButton } from "@/components/ui";
import { C, R, SP } from "@/lib/tokens";

// Same wheel geometry as the alarm editor: three columns, gaps, colon, spacer.
const WHEEL_COL_W = 64;
const WHEEL_W = WHEEL_COL_W * 3 + SP.sm * 4 + SP.md + SP.sm + SP.lg;

// ─── Goal options ──────────────────────────────────────────
const GOALS = [
  { id: "focus", label: "Focus & Clarity", icon: "locate", description: "Cut through the fog. Start sharp." },
  { id: "confidence", label: "Confidence", icon: "flash", description: "Show up fully. Own the day." },
  { id: "calm", label: "Calm & Stress Relief", icon: "water", description: "Less reactive. More grounded." },
  { id: "sleep", label: "Better Sleep", icon: "moon", description: "Deeper rest. Cleaner mornings." },
] as const;

const Check = <Ionicons name="checkmark" size={22} color={C.accent} />;

// ─── Progress dots ─────────────────────────────────────────
function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
      ))}
    </View>
  );
}

// ─── Step heading ──────────────────────────────────────────
function StepHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Txt kind="footnote" tone="secondary" style={styles.eyebrow}>
        {eyebrow}
      </Txt>
      <Txt kind="title1">{title}</Txt>
      {subtitle ? (
        <Txt kind="body" tone="secondary" style={styles.subtitle}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

// ─── Step 0: Goal selection ────────────────────────────────
function StepGoal({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <>
      <StepHeading
        eyebrow="STEP 1 OF 4"
        title={"What are you\ntraining for?"}
        subtitle="We'll tailor your morning sessions to this goal. You can change it later."
      />
      <Section>
        {GOALS.map((g) => (
          <Row
            key={g.id}
            icon={g.icon}
            title={g.label}
            subtitle={g.description}
            onPress={() => onSelect(g.id)}
            accessory={selected === g.id ? Check : "none"}
            accessibilityLabel={`${g.label}, ${g.description}${selected === g.id ? ", selected" : ""}`}
          />
        ))}
      </Section>
    </>
  );
}

// ─── Step 1: Wake time ─────────────────────────────────────
function StepWakeTime({
  hourIdx,
  minIdx,
  merIdx,
  setHourIdx,
  setMinIdx,
  setMerIdx,
}: {
  hourIdx: number;
  minIdx: number;
  merIdx: number;
  setHourIdx: (i: number) => void;
  setMinIdx: (i: number) => void;
  setMerIdx: (i: number) => void;
}) {
  const h = HOURS[hourIdx];
  const m = MINUTES[minIdx];
  const mer = MERIDIEM[merIdx];

  return (
    <>
      <StepHeading
        eyebrow="STEP 2 OF 4"
        title={"When do you\nwant to wake up?"}
        subtitle="We'll fire your first session at this time tomorrow. Scroll to set it."
      />
      <View style={styles.wheelWrap} accessible accessibilityLabel="Wake time">
        <WheelHighlight width={WHEEL_W} />
        <View style={styles.wheelColumns}>
          <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={WHEEL_COL_W} label="Hour" />
          <Txt kind="title2" style={styles.wheelColon}>:</Txt>
          <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={WHEEL_COL_W} label="Minute" />
          <View style={styles.wheelSpacer} />
          <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={WHEEL_COL_W} label="AM or PM" />
        </View>
      </View>
      <Txt kind="footnote" tone="tertiary" style={styles.caption}>
        Your session will play at {h}:{m} {mer} tomorrow.
      </Txt>
    </>
  );
}

// ─── Step 2: Notification permission ──────────────────────
function StepPermission({ onGrant, granted }: { onGrant: () => void; granted: boolean }) {
  return (
    <>
      <StepHeading
        eyebrow="STEP 3 OF 4"
        title={"One thing\nbefore you sleep."}
        subtitle="Que needs permission to wake you. Without it, your alarm is silent, which defeats the point."
      />
      <Section footer="Your alarm fires even when the phone is locked. We only send the alarms you set. No marketing, no spam.">
        <Row
          icon="notifications"
          title="Allow notifications"
          value={granted ? "Enabled" : undefined}
          onPress={granted ? undefined : onGrant}
          accessory={granted ? Check : "chevron"}
          accessibilityLabel={granted ? "Notifications enabled" : "Grant access"}
        />
      </Section>
    </>
  );
}

// ─── Step 3: Completion ────────────────────────────────────
function StepDone({
  goalId,
  hourIdx,
  minIdx,
  merIdx,
}: {
  goalId: string;
  hourIdx: number;
  minIdx: number;
  merIdx: number;
}) {
  const goal = GOALS.find((g) => g.id === goalId) ?? GOALS[0];
  const h = HOURS[hourIdx];
  const m = MINUTES[minIdx];
  const mer = MERIDIEM[merIdx];

  return (
    <>
      <StepHeading eyebrow="YOU'RE SET" title={"First session\nscheduled."} />
      <Section
        header="Your first alarm"
        footer={"Lock your phone. We'll take it from here.\nTomorrow morning, just tap the notification and let it run."}
      >
        <Row icon="alarm" title="Wake time" value={`${h}:${m} ${mer}`} />
        <Row icon={goal.icon} title="Goal" value={goal.label} />
      </Section>
    </>
  );
}

// ─── Main screen ───────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { add } = useAlarms();

  const [step, setStep] = useState(0);
  const [goalId, setGoalId] = useState<string>(GOALS[0].id);

  // Default wake time: 7:00 AM
  const [hourIdx, setHourIdx] = useState(6); // index 6 → "07"
  const [minIdx, setMinIdx] = useState(0);
  const [merIdx, setMerIdx] = useState(0); // AM

  const [notifGranted, setNotifGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const TOTAL_STEPS = 4;

  // Animate out → change step → animate in
  const goTo = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleGrant = async () => {
    const ok = await requestAlarmPermissions();
    if (ok) {
      setNotifGranted(true);
    } else {
      Alert.alert(
        "Permission denied",
        "You can enable notifications in Settings, under Notifications, then Morning Que.",
        [{ text: "OK" }]
      );
    }
  };

  const handleContinue = async () => {
    if (step < TOTAL_STEPS - 1) {
      goTo(step + 1);
    } else {
      await finish();
    }
  };

  const handleBack = () => {
    if (step > 0) goTo(step - 1);
  };

  const finish = async () => {
    setSaving(true);
    try {
      // 1. Build fire date
      let h = hourIdx + 1;
      if (merIdx === 1 && h < 12) h += 12;
      if (merIdx === 0 && h === 12) h = 0;
      const m = minIdx;

      const fire = new Date();
      fire.setHours(h, m, 0, 0);
      if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);

      // 2. Create the alarm in Supabase
      const result = await add({
        label: "Morning Session",
        mantra_id: goalId,
        next_fire_at: fire.toISOString(),
        repeat_days: [],
        enabled: true,
      });
      const created = result?.data;

      // 3. Schedule OS notification
      if (created) {
        await scheduleAlarm({
          id: created.id,
          label: created.label,
          next_fire_at: created.next_fire_at,
          mantra_id: created.mantra_id,
          enabled: created.enabled,
          repeat_days: created.repeat_days,
        });
      }

      // 4. Mark user as onboarded
      await supabase.auth.updateUser({
        data: { onboarded: true, goal: goalId },
      });

      // 5. Navigate to alarms list
      router.replace("/alarms" as any);
    } catch (err) {
      console.error("[onboarding] finish error:", err);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // CTA label
  const ctaLabel = () => {
    if (saving) return "Setting up...";
    if (step === TOTAL_STEPS - 1) return "Start Que";
    if (step === 2 && !notifGranted) return "Skip for Now";
    return "Continue";
  };

  return (
    <Screen>
      {/* Top bar: back (from step 2 on) and progress */}
      <View style={[styles.topBar, { paddingTop: top }]}>
        {step > 0 ? (
          <IconButton icon="chevron-back" label="Go back" onPress={handleBack} />
        ) : (
          <View style={styles.topSpacer} />
        )}
        <ProgressDots step={step} total={TOTAL_STEPS} />
        <View style={styles.topSpacer} />
      </View>

      {/* Step content */}
      <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
          {step === 0 && <StepGoal selected={goalId} onSelect={setGoalId} />}
          {step === 1 && (
            <StepWakeTime
              hourIdx={hourIdx}
              minIdx={minIdx}
              merIdx={merIdx}
              setHourIdx={setHourIdx}
              setMinIdx={setMinIdx}
              setMerIdx={setMerIdx}
            />
          )}
          {step === 2 && <StepPermission onGrant={handleGrant} granted={notifGranted} />}
          {step === 3 && <StepDone goalId={goalId} hourIdx={hourIdx} minIdx={minIdx} merIdx={merIdx} />}
        </ScrollView>
      </Animated.View>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: bottom + SP.lg }]}>
        <Button title={ctaLabel()} onPress={handleContinue} disabled={saving} />
        <Button
          title="Skip for now"
          tone="plain"
          onPress={async () => {
            try {
              await supabase.auth.updateUser({ data: { onboarded: true } });
            } catch {}
            router.replace("/alarms" as any);
          }}
          accessibilityLabel="Skip onboarding for now"
          style={styles.skip}
        />
      </View>
    </Screen>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.xs,
  },
  topSpacer: {
    width: SP.hit,
    height: SP.hit,
  },
  dotsRow: {
    flexDirection: "row",
    gap: SP.xs,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: R.pill,
    backgroundColor: C.fillHighest,
  },
  dotActive: {
    backgroundColor: C.accent,
    width: 18,
  },

  stepWrap: {
    flex: 1,
  },
  stepContent: {
    paddingBottom: SP.xl,
  },
  heading: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.md,
  },
  eyebrow: {
    marginBottom: SP.sm,
  },
  subtitle: {
    marginTop: SP.sm,
  },

  wheelWrap: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SP.xl,
  },
  wheelColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
  },
  wheelColon: {
    marginBottom: 2,
  },
  wheelSpacer: {
    width: SP.sm,
  },
  caption: {
    textAlign: "center",
    marginTop: SP.md,
    paddingHorizontal: SP.screen,
  },

  footer: {
    paddingHorizontal: SP.screen,
    paddingTop: SP.md,
  },
  skip: {
    marginTop: SP.xs,
  },
});
