import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile } from "@/lib/useSupabase";
import {
  markOnboardingComplete,
  setPrimaryGoal,
  setWakeTime,
  GOALS,
  type GoalId,
} from "@/lib/onboarding";
import { F } from "@/lib/fonts";
import { C, FS, SPACE } from "@/lib/tokens";

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { update: updateProfile } = useProfile();

  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Step 1 — Name
  const [name, setName] = useState("");

  // Step 2 — Goal
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);

  // Step 3 — Wake time
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(0);
  const [wakePeriod, setWakePeriod] = useState<"AM" | "PM">("AM");

  const animateTransition = (next: number) => {
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

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) animateTransition(step + 1);
  };

  const goBack = () => {
    if (step > 0) animateTransition(step - 1);
  };

  const canAdvance = (): boolean => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return selectedGoal !== null;
    if (step === 2) return true;
    return true;
  };

  const finish = async () => {
    // Save name to profile
    if (name.trim()) {
      await updateProfile({ first_name: name.trim() });
    }

    // Save goal locally
    if (selectedGoal) {
      await setPrimaryGoal(selectedGoal);
    }

    // Save wake time locally
    const hour24 =
      wakePeriod === "AM"
        ? wakeHour === 12
          ? 0
          : wakeHour
        : wakeHour === 12
          ? 12
          : wakeHour + 12;
    await setWakeTime(hour24, wakeMinute);

    // Mark onboarding done
    await markOnboardingComplete();

    router.replace("/");
  };

  // ─── Progress dots ──────────────────────────────────────
  const ProgressDots = () => (
    <View style={styles.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
        />
      ))}
    </View>
  );

  // ─── Step 1: Name ──────────────────────────────────────
  const StepName = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>STEP 1 OF {TOTAL_STEPS}</Text>
      <Text style={styles.heading}>What should we call you?</Text>
      <Text style={styles.subheading}>
        Your morning session starts with your name. Make it personal.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        placeholderTextColor={C.fgFaint}
        style={styles.nameInput}
        autoCapitalize="words"
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => canAdvance() && goNext()}
      />
    </View>
  );

  // ─── Step 2: Goal ──────────────────────────────────────
  const StepGoal = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>STEP 2 OF {TOTAL_STEPS}</Text>
      <Text style={styles.heading}>What are you working on?</Text>
      <Text style={styles.subheading}>
        Pick the thing that matters most right now. You can always change this later.
      </Text>
      <ScrollView
        style={styles.goalScroll}
        contentContainerStyle={styles.goalGrid}
        showsVerticalScrollIndicator={false}
      >
        {GOALS.map((goal) => {
          const active = selectedGoal === goal.id;
          return (
            <Pressable
              key={goal.id}
              style={[styles.goalCard, active && styles.goalCardActive]}
              onPress={() => setSelectedGoal(goal.id)}
            >
              <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>
                {goal.label}
              </Text>
              <Text style={[styles.goalDesc, active && styles.goalDescActive]}>
                {goal.description}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // ─── Step 3: Wake time ─────────────────────────────────
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const StepWakeTime = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>STEP 3 OF {TOTAL_STEPS}</Text>
      <Text style={styles.heading}>When do you wake up?</Text>
      <Text style={styles.subheading}>
        We&apos;ll set your first alarm. Your session plays the moment it goes off.
      </Text>

      <View style={styles.timePickerWrap}>
        {/* Hour */}
        <ScrollView
          style={styles.timeColumn}
          contentContainerStyle={styles.timeColumnContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={52}
          decelerationRate="fast"
        >
          {hours.map((h) => (
            <Pressable
              key={h}
              style={[styles.timeCell, wakeHour === h && styles.timeCellActive]}
              onPress={() => setWakeHour(h)}
            >
              <Text style={[styles.timeDigit, wakeHour === h && styles.timeDigitActive]}>
                {h}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.timeColon}>:</Text>

        {/* Minute */}
        <ScrollView
          style={styles.timeColumn}
          contentContainerStyle={styles.timeColumnContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={52}
          decelerationRate="fast"
        >
          {minutes.map((m) => (
            <Pressable
              key={m}
              style={[styles.timeCell, wakeMinute === m && styles.timeCellActive]}
              onPress={() => setWakeMinute(m)}
            >
              <Text style={[styles.timeDigit, wakeMinute === m && styles.timeDigitActive]}>
                {String(m).padStart(2, "0")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* AM/PM */}
        <View style={styles.periodColumn}>
          <Pressable
            style={[styles.periodCell, wakePeriod === "AM" && styles.periodCellActive]}
            onPress={() => setWakePeriod("AM")}
          >
            <Text style={[styles.periodText, wakePeriod === "AM" && styles.periodTextActive]}>
              AM
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodCell, wakePeriod === "PM" && styles.periodCellActive]}
            onPress={() => setWakePeriod("PM")}
          >
            <Text style={[styles.periodText, wakePeriod === "PM" && styles.periodTextActive]}>
              PM
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.timePreview}>
        {wakeHour}:{String(wakeMinute).padStart(2, "0")} {wakePeriod}
      </Text>
    </View>
  );

  // ─── Step 4: Ready ─────────────────────────────────────
  const goalLabel = GOALS.find((g) => g.id === selectedGoal)?.label ?? "";

  const StepReady = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>YOU&apos;RE ALL SET</Text>
      <Text style={styles.heading}>Good morning, {name}.</Text>
      <Text style={styles.readyBody}>
        Every morning at {wakeHour}:{String(wakeMinute).padStart(2, "0")} {wakePeriod}, Que will
        guide you through a personalized audio session designed to help you{" "}
        <Text style={styles.readyHighlight}>{goalLabel.toLowerCase()}</Text>.
      </Text>
      <Text style={styles.readyBody}>
        You&apos;ll hear it in that half-asleep window — the theta state — when your mind is most
        open to positive change. No jarring alarm. No snooze button. Just a calm, focused start.
      </Text>

      <View style={styles.readyFeatures}>
        <View style={styles.featureRow}>
          <Ionicons name="musical-notes-outline" size={20} color={C.accent} />
          <Text style={styles.featureText}>Personalized audio sessions</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="moon-outline" size={20} color={C.accent} />
          <Text style={styles.featureText}>Theta-state guided programming</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="alarm-outline" size={20} color={C.accent} />
          <Text style={styles.featureText}>Smart alarm with ambient sound</Text>
        </View>
      </View>
    </View>
  );

  const steps = [StepName, StepGoal, StepWakeTime, StepReady];
  const CurrentStep = steps[step];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Back button */}
      {step > 0 && (
        <Pressable style={styles.backButton} onPress={goBack} hitSlop={16}>
          <Ionicons name="arrow-back" size={24} color={C.fg} />
        </Pressable>
      )}

      <ProgressDots />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <CurrentStep />
      </Animated.View>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.nextButton, !canAdvance() && styles.nextButtonDisabled]}
          onPress={step === TOTAL_STEPS - 1 ? finish : goNext}
          disabled={!canAdvance()}
        >
          <Text style={[styles.nextButtonText, !canAdvance() && styles.nextButtonTextDisabled]}>
            {step === TOTAL_STEPS - 1 ? "Get Started" : "Continue"}
          </Text>
          {step < TOTAL_STEPS - 1 && (
            <Ionicons
              name="arrow-forward"
              size={18}
              color={canAdvance() ? "#000" : C.fgFaint}
              style={{ marginLeft: 6 }}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bgDeep,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: SPACE.screenPad,
    zIndex: 99,
    padding: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 68,
    paddingBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.panelHigh,
  },
  dotActive: {
    backgroundColor: C.accent,
    width: 24,
  },
  dotDone: {
    backgroundColor: C.fgDim,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACE.inputPad,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 32,
  },
  stepLabel: {
    fontFamily: F.semibold,
    fontSize: FS.xs,
    color: C.accent,
    letterSpacing: 2,
    marginBottom: 16,
  },
  heading: {
    fontFamily: F.bold,
    fontSize: 28,
    color: C.fg,
    marginBottom: 12,
  },
  subheading: {
    fontFamily: F.regular,
    fontSize: FS.base,
    color: C.fgDim,
    lineHeight: 22,
    marginBottom: 32,
  },

  // Step 1 — Name
  nameInput: {
    backgroundColor: C.panelMid,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: C.fg,
    fontSize: FS["2xl"],
    fontFamily: F.medium,
    borderWidth: 1,
    borderColor: C.border,
  },

  // Step 2 — Goal
  goalScroll: {
    flex: 1,
  },
  goalGrid: {
    gap: 10,
    paddingBottom: 20,
  },
  goalCard: {
    backgroundColor: C.panel,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  goalCardActive: {
    borderColor: C.accent,
    backgroundColor: "#1a1528",
  },
  goalLabel: {
    fontFamily: F.semibold,
    fontSize: FS.md,
    color: C.fg,
    marginBottom: 4,
  },
  goalLabelActive: {
    color: C.accent,
  },
  goalDesc: {
    fontFamily: F.regular,
    fontSize: FS.sm,
    color: C.fgDim,
  },
  goalDescActive: {
    color: C.fgMid,
  },

  // Step 3 — Wake time
  timePickerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  timeColumn: {
    height: 208,
    width: 72,
  },
  timeColumnContent: {
    paddingVertical: 4,
  },
  timeCell: {
    height: 48,
    marginVertical: 2,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.panel,
  },
  timeCellActive: {
    backgroundColor: C.accent,
  },
  timeDigit: {
    fontFamily: F.semibold,
    fontSize: FS["3xl"],
    color: C.fgDim,
  },
  timeDigitActive: {
    color: "#000",
  },
  timeColon: {
    fontFamily: F.light,
    fontSize: 36,
    color: C.fgDim,
    marginHorizontal: 2,
  },
  periodColumn: {
    gap: 4,
    marginLeft: 8,
  },
  periodCell: {
    height: 48,
    width: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.panel,
  },
  periodCellActive: {
    backgroundColor: C.accent,
  },
  periodText: {
    fontFamily: F.semibold,
    fontSize: FS.md,
    color: C.fgDim,
  },
  periodTextActive: {
    color: "#000",
  },
  timePreview: {
    fontFamily: F.light,
    fontSize: 48,
    color: C.fg,
    textAlign: "center",
    marginTop: 28,
    letterSpacing: -2,
  },

  // Step 4 — Ready
  readyBody: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: C.fgMid,
    lineHeight: 24,
    marginBottom: 16,
  },
  readyHighlight: {
    fontFamily: F.semibold,
    color: C.accent,
  },
  readyFeatures: {
    marginTop: 16,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontFamily: F.regular,
    fontSize: FS.base,
    color: C.fg,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: SPACE.inputPad,
    paddingBottom: 44,
    paddingTop: 12,
  },
  nextButton: {
    backgroundColor: C.fg,
    borderRadius: 14,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: C.panelHigh,
  },
  nextButtonText: {
    fontFamily: F.semibold,
    fontSize: FS.lg,
    color: "#000",
  },
  nextButtonTextDisabled: {
    color: C.fgFaint,
  },
});
