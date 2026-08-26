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

import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAlarms } from "@/lib/useSupabase";
import { scheduleAlarm } from "@/lib/alarmScheduler";
import { requestAlarmPermissions } from "@/lib/alarmScheduler";
import { F, S } from "@/lib/fonts";

const { width: SW } = Dimensions.get("window");

// ─── Wheel column (same pattern as edit-alarm) ────────────
const ITEM_H = 44;
const VISIBLE = 5;

function WheelColumn({
  data,
  selected,
  onSelect,
  width = 56,
}: {
  data: string[];
  selected: number;
  onSelect: (index: number) => void;
  width?: number;
}) {
  const listRef = useRef<FlatList<string>>(null);

  const handleScrollEnd = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_H);
      onSelect(Math.max(0, Math.min(idx, data.length - 1)));
    },
    [data.length, onSelect]
  );

  return (
    <View style={{ height: ITEM_H * VISIBLE, overflow: "hidden", width }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        initialScrollIndex={selected}
        getItemLayout={(_, index) => ({
          length: ITEM_H,
          offset: ITEM_H * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isSel = index === selected;
          return (
            <View style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: S.title,
                  fontFamily: isSel ? F.medium : F.regular,
                  color: isSel ? "#f5f5f7" : "#48484a",
                }}
                maxFontSizeMultiplier={1.4}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── Data ─────────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const MERIDIEM = ["AM", "PM"];

// ─── Goal options ──────────────────────────────────────────
const GOALS = [
  {
    id: "focus",
    label: "Focus & Clarity",
    icon: "🎯",
    description: "Cut through the fog. Start sharp.",
  },
  {
    id: "confidence",
    label: "Confidence",
    icon: "⚡",
    description: "Show up fully. Own the day.",
  },
  {
    id: "calm",
    label: "Calm & Stress Relief",
    icon: "🌊",
    description: "Less reactive. More grounded.",
  },
  {
    id: "sleep",
    label: "Better Sleep",
    icon: "🌙",
    description: "Deeper rest. Cleaner mornings.",
  },
];

// ─── Progress dots ─────────────────────────────────────────
function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step && styles.dotActive]}
        />
      ))}
    </View>
  );
}

// ─── Step 0: Goal selection ────────────────────────────────
function StepGoal({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepEyebrow}>STEP 1 OF 4</Text>
      <Text style={styles.stepTitle}>What are you{"\n"}training for?</Text>
      <Text style={styles.stepSubtitle}>
        We'll tailor your morning sessions to this goal. You can change it later.
      </Text>

      <View style={styles.goalGrid}>
        {GOALS.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => onSelect(g.id)}
            style={[styles.goalCard, selected === g.id && styles.goalCardSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${g.label}, ${g.description}`}
            accessibilityState={{ selected: selected === g.id }}
          >
            <Text style={styles.goalIcon}>{g.icon}</Text>
            <Text style={[styles.goalLabel, selected === g.id && styles.goalLabelSelected]}>
              {g.label}
            </Text>
            <Text style={styles.goalDescription}>{g.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
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
    <View style={styles.stepContent}>
      <Text style={styles.stepEyebrow}>STEP 2 OF 4</Text>
      <Text style={styles.stepTitle}>When do you{"\n"}want to wake up?</Text>
      <Text style={styles.stepSubtitle}>
        We'll fire your first session at this time tomorrow. Scroll to set it.
      </Text>

      <View style={styles.pickerWrap}>
        <View style={styles.pickerHighlight} />
        <View style={styles.pickerColumns}>
          <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={56} />
          <Text style={styles.pickerColon}>:</Text>
          <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={56} />
          <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={56} />
        </View>
      </View>

      <Text style={styles.pickerCaption}>
        Your session will play at {h}:{m} {mer} tomorrow.
      </Text>
    </View>
  );
}

// ─── Step 2: Notification permission ──────────────────────
function StepPermission({
  onGrant,
  granted,
}: {
  onGrant: () => void;
  granted: boolean;
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepEyebrow}>STEP 3 OF 4</Text>
      <Text style={styles.stepTitle}>One thing{"\n"}before you sleep.</Text>
      <Text style={styles.stepSubtitle}>
        Que needs permission to wake you. Without it, your alarm is silent — which defeats the point.
      </Text>

      <View style={styles.permissionCard}>
        <Text style={styles.permissionIcon}>🔔</Text>
        <Text style={styles.permissionCardTitle}>Allow notifications</Text>
        <Text style={styles.permissionCardBody}>
          Your alarm fires even when the phone is locked. We only send notifications you schedule — no marketing, no spam.
        </Text>
      </View>

      {granted ? (
        <View style={styles.grantedRow}>
          <Text style={styles.grantedText}>✓ Notifications enabled</Text>
        </View>
      ) : (
        <Pressable style={styles.grantButton} onPress={onGrant} accessibilityRole="button">
          <Text style={styles.grantButtonText}>Grant Access</Text>
        </Pressable>
      )}
    </View>
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
    <View style={styles.stepContent}>
      <Text style={styles.stepEyebrow}>YOU'RE SET</Text>
      <Text style={styles.stepTitle}>First session{"\n"}scheduled.</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Wake time</Text>
          <Text style={styles.summaryValue}>
            {h}:{m} {mer}
          </Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Goal</Text>
          <Text style={styles.summaryValue}>
            {goal.icon} {goal.label}
          </Text>
        </View>
      </View>

      <Text style={styles.doneBody}>
        Lock your phone. We'll take it from here.{"\n"}
        Tomorrow morning, just tap the notification and let it run.
      </Text>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { add } = useAlarms();

  const [step, setStep] = useState(0);
  const [goalId, setGoalId] = useState(GOALS[0].id);

  // Default wake time: 7:00 AM
  const [hourIdx, setHourIdx] = useState(6);   // index 6 → "07"
  const [minIdx, setMinIdx] = useState(0);
  const [merIdx, setMerIdx] = useState(0);     // AM

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
        "You can enable notifications in Settings → Notifications → Que.",
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

  const ctaDisabled = saving;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable
            onPress={handleBack}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.logoText}>Morning Que</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={step} total={TOTAL_STEPS} />

      {/* Step content */}
      <Animated.View style={[styles.stepWrap, { opacity: fadeAnim }]}>
        {step === 0 && (
          <StepGoal selected={goalId} onSelect={setGoalId} />
        )}
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
        {step === 2 && (
          <StepPermission onGrant={handleGrant} granted={notifGranted} />
        )}
        {step === 3 && (
          <StepDone
            goalId={goalId}
            hourIdx={hourIdx}
            minIdx={minIdx}
            merIdx={merIdx}
          />
        )}
      </Animated.View>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Pressable
          style={[styles.ctaButton, ctaDisabled && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={ctaDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: ctaDisabled }}
        >
          <Text style={styles.ctaText}>{ctaLabel()}</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            try {
              await supabase.auth.updateUser({ data: { onboarded: true } });
            } catch {}
            router.replace("/alarms" as any);
          }}
          hitSlop={10}
          style={{ alignItems: "center", paddingTop: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding for now"
        >
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: S.caption, fontFamily: F.regular }}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    alignItems: "flex-start",
  },
  backText: {
    color: "#f5f5f7",
    fontSize: S.title,
    fontFamily: F.light,
  },
  logoText: {
    fontFamily: "Lora",
    fontSize: S.title,
    color: "#f5f5f7",
  },

  // Progress dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2c2c2e",
  },
  dotActive: {
    backgroundColor: "#f5f5f7",
    width: 18,
  },

  // Step
  stepWrap: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  stepEyebrow: {
    fontSize: S.micro,
    fontFamily: F.semibold,
    color: "#52525b",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: S.display,
    fontFamily: F.bold,
    color: "#f5f5f7",
    lineHeight: 40,
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: S.body,
    fontFamily: F.regular,
    color: "#8b8b93",
    lineHeight: 24,
    marginBottom: 32,
  },

  // Goal grid
  goalGrid: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: "#0f0f13",
    borderWidth: 1,
    borderColor: "#1c1c1e",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  goalCardSelected: {
    borderColor: "#f5f5f7",
    backgroundColor: "#111118",
  },
  goalIcon: {
    fontSize: S.title,
    width: 32,
    textAlign: "center",
  },
  goalLabel: {
    fontSize: S.body,
    fontFamily: F.medium,
    color: "#8b8b93",
    flex: 1,
  },
  goalLabelSelected: {
    color: "#f5f5f7",
  },
  goalDescription: {
    fontSize: S.caption,
    fontFamily: F.regular,
    color: "#3f3f46",
  },

  // Picker (wake time)
  pickerWrap: {
    alignSelf: "center",
    position: "relative",
    marginBottom: 16,
  },
  pickerHighlight: {
    position: "absolute",
    top: ITEM_H * 2,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
  },
  pickerColumns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pickerColon: {
    fontSize: S.title,
    fontFamily: F.regular,
    color: "#f5f5f7",
    marginBottom: 2,
  },
  pickerCaption: {
    textAlign: "center",
    fontSize: S.caption,
    fontFamily: F.regular,
    color: "#52525b",
    marginTop: 4,
  },

  // Notification permission
  permissionCard: {
    backgroundColor: "#0f0f13",
    borderWidth: 1,
    borderColor: "#1c1c1e",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  permissionIcon: {
    fontSize: S.display,
    marginBottom: 12,
  },
  permissionCardTitle: {
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#f5f5f7",
    marginBottom: 10,
  },
  permissionCardBody: {
    fontSize: S.caption,
    fontFamily: F.regular,
    color: "#8b8b93",
    lineHeight: 22,
    textAlign: "center",
  },
  grantButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  grantButtonText: {
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#000000",
  },
  grantedRow: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  grantedText: {
    fontSize: S.body,
    fontFamily: F.medium,
    color: "#4cd964",
  },

  // Completion
  summaryCard: {
    backgroundColor: "#0f0f13",
    borderWidth: 1,
    borderColor: "#1c1c1e",
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
  },
  summarySep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1c1c1e",
  },
  summaryLabel: {
    fontSize: S.body,
    fontFamily: F.regular,
    color: "#8b8b93",
  },
  summaryValue: {
    fontSize: S.body,
    fontFamily: F.medium,
    color: "#f5f5f7",
  },
  doneBody: {
    fontSize: S.secondary,
    fontFamily: F.regular,
    color: "#52525b",
    lineHeight: 24,
  },

  // CTA
  ctaWrap: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
  },
  ctaButton: {
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: S.body,
    fontFamily: F.semibold,
    color: "#000000",
  },
});
