import { useState, useRef, useMemo } from "react";
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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/lib/useSupabase";
import {
  markOnboardingComplete,
  setPrimaryGoal,
  setWakeTime,
  setHypnotizability,
  setGoalContext,
  GOALS,
  HYPNO_CHOICES,
  GOAL_CONTEXT,
  type GoalId,
} from "@/lib/onboarding";
import { F } from "@/lib/fonts";
import { C, FS, SPACE, LS } from "@/lib/tokens";

const TOTAL_STEPS = 6;

// One accent. One foreground. One background. That's the palette.
const ACCENT = C.alarm;       // #ff9f0a
const HAIRLINE = "#1f1f24";  // low-contrast divider

export default function OnboardingScreen() {
  const router = useRouter();
  const { update: updateProfile } = useProfile();

  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Step 2 — Hypnotizability
  const [hypno, setHypno] = useState<string | null>(null);

  // Step 3 — Goal
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);

  // Step 4 — Goal context (depends on selectedGoal)
  const [goalCtx, setGoalCtx] = useState<string | null>(null);

  // Step 5 — Wake time
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(0);
  const [wakePeriod, setWakePeriod] = useState<"AM" | "PM">("AM");

  // Step 6 — Name
  const [name, setName] = useState("");

  // Reset goal context when goal changes
  const handleGoalSelect = (id: GoalId) => {
    if (id !== selectedGoal) setGoalCtx(null);
    setSelectedGoal(id);
  };

  const animateTransition = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
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
    if (step === 0) return true;                     // Premise — always advance
    if (step === 1) return hypno !== null;          // Hypnotizability
    if (step === 2) return selectedGoal !== null;   // Goal
    if (step === 3) return goalCtx !== null;        // Goal context
    if (step === 4) return true;                    // Wake time always valid
    if (step === 5) return name.trim().length > 0;  // Name required to "Begin"
    return true;
  };

  const persistAndExit = async () => {
    // Save whatever the user provided (some may be null on skip)
    if (selectedGoal) await setPrimaryGoal(selectedGoal);
    if (goalCtx) await setGoalContext(goalCtx);
    if (hypno) await setHypnotizability(hypno);
    if (name.trim()) await updateProfile({ first_name: name.trim() });

    const hour24 =
      wakePeriod === "AM"
        ? wakeHour === 12 ? 0 : wakeHour
        : wakeHour === 12 ? 12 : wakeHour + 12;
    await setWakeTime(hour24, wakeMinute);

    await markOnboardingComplete();
    router.replace("/");
  };

  const confirmSkip = () => {
    Alert.alert(
      "Skip setup?",
      "You can finish this later from Settings. Your morning session will use defaults until you do.",
      [
        { text: "Keep going", style: "cancel" },
        { text: "Skip", style: "destructive", onPress: persistAndExit },
      ]
    );
  };

  const stepLabel = (n: number) =>
    `${String(n + 1).padStart(2, "0")} / ${String(TOTAL_STEPS).padStart(2, "0")}`;

  // ─── Progress bar ──────────────────────────────────────────
  const ProgressBar = () => (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, i <= step && styles.progressSegmentDone]}
        />
      ))}
    </View>
  );

  // ─── Step 1: Premise ────────────────────────────────────────
  const StepPremise = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>{stepLabel(0)}</Text>
      <Text style={styles.heading}>
        Most alarms attack{"\n"}you awake.{"\n"}
        <Text style={styles.headingAccent}>Que doesn&apos;t.</Text>
      </Text>
      <Text style={styles.bodyLead}>
        Que meets you in the moment between sleep and waking — the window when
        the mind is most open to suggestion — and uses it.
      </Text>
      <Text style={styles.bodyLead}>
        No shock. No snooze. A short, personalized session in your ear, then
        the day. That&apos;s it.
      </Text>
    </View>
  );

  // ─── Step 2: Hypnotizability ───────────────────────────────
  const StepHypno = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>{stepLabel(1)}</Text>
      <Text style={styles.heading}>Have you ever been{"\n"}hypnotized?</Text>
      <Text style={styles.subheading}>
        No wrong answer. Most people don&apos;t know yet.
      </Text>

      <View style={styles.choiceList}>
        {HYPNO_CHOICES.map((choice, idx) => {
          const active = hypno === choice.id;
          return (
            <Pressable
              key={choice.id}
              style={[styles.choiceRow, idx === 0 && styles.choiceRowFirst]}
              onPress={() => setHypno(choice.id)}
            >
              <View style={styles.choiceRowInner}>
                <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>
                  {choice.label}
                </Text>
                <View style={[styles.choiceMark, active && styles.choiceMarkActive]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // ─── Step 3: Goal ──────────────────────────────────────────
  const StepGoal = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>{stepLabel(2)}</Text>
      <Text style={styles.heading}>What are you{"\n"}working on?</Text>
      <Text style={styles.subheading}>
        Pick what matters most right now. You can change it later.
      </Text>
      <ScrollView
        style={styles.goalScroll}
        contentContainerStyle={styles.goalList}
        showsVerticalScrollIndicator={false}
      >
        {GOALS.map((goal, idx) => {
          const active = selectedGoal === goal.id;
          return (
            <Pressable
              key={goal.id}
              style={[styles.goalRow, idx === 0 && styles.goalRowFirst]}
              onPress={() => handleGoalSelect(goal.id)}
            >
              <View style={styles.goalRowInner}>
                <Text style={styles.goalIndex}>
                  {String(idx + 1).padStart(2, "0")}
                </Text>
                <View style={styles.goalTextWrap}>
                  <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>
                    {goal.label}
                  </Text>
                  <Text style={styles.goalDesc}>{goal.description}</Text>
                </View>
                <View style={[styles.choiceMark, active && styles.choiceMarkActive]} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // ─── Step 4: Goal-specific follow-up ───────────────────────
  const goalQuestion = useMemo(() => {
    if (!selectedGoal) return null;
    return GOAL_CONTEXT[selectedGoal];
  }, [selectedGoal]);

  const StepGoalContext = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>{stepLabel(3)}</Text>
      <Text style={styles.heading}>{goalQuestion?.prompt ?? ""}</Text>
      <Text style={styles.subheading}>
        Helps us shape the session around what&apos;s actually true for you.
      </Text>

      <View style={styles.choiceList}>
        {goalQuestion?.choices.map((choice, idx) => {
          const active = goalCtx === choice.id;
          return (
            <Pressable
              key={choice.id}
              style={[styles.choiceRow, idx === 0 && styles.choiceRowFirst]}
              onPress={() => setGoalCtx(choice.id)}
            >
              <View style={styles.choiceRowInner}>
                <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>
                  {choice.label}
                </Text>
                <View style={[styles.choiceMark, active && styles.choiceMarkActive]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // ─── Step 5: Wake time ─────────────────────────────────────
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const StepWakeTime = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>{stepLabel(4)}</Text>
      <Text style={styles.heading}>What time should{"\n"}we wake you?</Text>
      <Text style={styles.subheading}>
        Your session plays the moment your alarm fires.
      </Text>

      <View style={styles.timePickerWrap}>
        <ScrollView
          style={styles.timeColumn}
          contentContainerStyle={styles.timeColumnContent}
          showsVerticalScrollIndicator={false}
        >
          {hours.map((h) => (
            <Pressable key={h} style={styles.timeCell} onPress={() => setWakeHour(h)}>
              <Text style={[styles.timeDigit, wakeHour === h && styles.timeDigitActive]}>
                {h}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.timeColon}>:</Text>

        <ScrollView
          style={styles.timeColumn}
          contentContainerStyle={styles.timeColumnContent}
          showsVerticalScrollIndicator={false}
        >
          {minutes.map((m) => (
            <Pressable key={m} style={styles.timeCell} onPress={() => setWakeMinute(m)}>
              <Text style={[styles.timeDigit, wakeMinute === m && styles.timeDigitActive]}>
                {String(m).padStart(2, "0")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.periodColumn}>
          <Pressable style={styles.periodCell} onPress={() => setWakePeriod("AM")}>
            <Text style={[styles.periodText, wakePeriod === "AM" && styles.periodTextActive]}>
              AM
            </Text>
          </Pressable>
          <Pressable style={styles.periodCell} onPress={() => setWakePeriod("PM")}>
            <Text style={[styles.periodText, wakePeriod === "PM" && styles.periodTextActive]}>
              PM
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.timePreviewWrap}>
        <Text style={styles.timePreviewLabel}>SET FOR</Text>
        <Text style={styles.timePreview}>
          {wakeHour}:{String(wakeMinute).padStart(2, "0")}
          <Text style={styles.timePreviewPeriod}>  {wakePeriod}</Text>
        </Text>
      </View>
    </View>
  );

  // ─── Step 6: Name + Payoff ─────────────────────────────────
  const goalLabel = GOALS.find((g) => g.id === selectedGoal)?.label ?? "your focus";
  const greetingName = name.trim() || "there";

  const StepNamePayoff = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepLabel}>{stepLabel(5)}</Text>
      <Text style={styles.heading}>What should we{"\n"}call you?</Text>
      <Text style={styles.subheading}>
        Your session opens with your name, spoken in your ear.
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="First name"
        placeholderTextColor={C.fgFaint}
        style={styles.nameInput}
        autoCapitalize="words"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => canAdvance() && persistAndExit()}
      />
      <View style={styles.inputRule} />

      <View style={styles.payoffBlock}>
        <Text style={styles.payoffLabel}>TOMORROW MORNING</Text>
        <Text style={styles.payoffLine}>
          <Text style={styles.payoffAccent}>
            {wakeHour}:{String(wakeMinute).padStart(2, "0")} {wakePeriod}
          </Text>
          {"  ·  "}
          <Text style={styles.payoffMid}>{goalLabel}</Text>
        </Text>
        <Text style={styles.payoffBody}>
          &quot;Good morning, {greetingName}. Let&apos;s build a better one
          together.&quot;
        </Text>
      </View>
    </View>
  );

  const steps = [StepPremise, StepHypno, StepGoal, StepGoalContext, StepWakeTime, StepNamePayoff];
  const CurrentStep = steps[step];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <ProgressBar />
        <View style={styles.headerActions}>
          {step > 0 ? (
            <Pressable onPress={goBack} hitSlop={16}>
              <Text style={styles.headerLink}>BACK</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={confirmSkip} hitSlop={16}>
            <Text style={styles.headerLink}>SKIP SETUP</Text>
          </Pressable>
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <CurrentStep />
      </Animated.View>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.nextButton, !canAdvance() && styles.nextButtonDisabled]}
          onPress={step === TOTAL_STEPS - 1 ? persistAndExit : goNext}
          disabled={!canAdvance()}
        >
          <Text style={[styles.nextButtonText, !canAdvance() && styles.nextButtonTextDisabled]}>
            {step === TOTAL_STEPS - 1 ? "Begin" : "Continue"}
          </Text>
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

  // ─── Header ────────────────────────────────────────────────
  header: {
    paddingTop: 64,
    paddingHorizontal: SPACE.inputPad,
    paddingBottom: 28,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 2,
    backgroundColor: HAIRLINE,
  },
  progressSegmentDone: {
    backgroundColor: C.fg,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 28,
    marginTop: 20,
  },
  headerLink: {
    fontFamily: F.medium,
    fontSize: FS.xs,
    color: C.fgDim,
    letterSpacing: LS.widest,
  },

  // ─── Content ───────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: SPACE.inputPad,
  },
  stepContainer: {
    flex: 1,
  },
  stepLabel: {
    fontFamily: F.medium,
    fontSize: FS.xs,
    color: ACCENT,
    letterSpacing: LS.widest,
    marginBottom: 24,
  },
  heading: {
    fontFamily: F.regular,
    fontSize: 34,
    color: C.fg,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  headingAccent: {
    color: ACCENT,
  },
  subheading: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: C.fgDim,
    lineHeight: 22,
    marginBottom: 32,
  },
  bodyLead: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: C.fgMid,
    lineHeight: 24,
    marginBottom: 16,
  },

  // ─── Choice rows (used by hypno + goal context) ────────────
  choiceList: {
    marginTop: 4,
  },
  choiceRow: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  choiceRowFirst: {
    borderTopWidth: 0,
  },
  choiceRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  choiceLabel: {
    flex: 1,
    fontFamily: F.regular,
    fontSize: FS.lg,
    color: C.fg,
    paddingRight: 16,
  },
  choiceLabelActive: {
    color: ACCENT,
  },
  choiceMark: {
    width: 10,
    height: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.fgFaint,
  },
  choiceMarkActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },

  // ─── Goal step ─────────────────────────────────────────────
  goalScroll: {
    flex: 1,
  },
  goalList: {
    paddingBottom: 20,
  },
  goalRow: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  goalRowFirst: {
    borderTopWidth: 0,
  },
  goalRowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 14,
  },
  goalIndex: {
    fontFamily: F.medium,
    fontSize: FS.xs,
    color: C.fgFaint,
    letterSpacing: LS.wider,
    width: 28,
  },
  goalTextWrap: {
    flex: 1,
  },
  goalLabel: {
    fontFamily: F.regular,
    fontSize: FS.lg,
    color: C.fg,
    marginBottom: 2,
  },
  goalLabelActive: {
    color: ACCENT,
  },
  goalDesc: {
    fontFamily: F.regular,
    fontSize: FS.sm,
    color: C.fgDim,
  },

  // ─── Wake time ─────────────────────────────────────────────
  timePickerWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  timeColumn: {
    height: 200,
    width: 60,
  },
  timeColumnContent: {
    paddingVertical: 2,
  },
  timeCell: {
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  timeDigit: {
    fontFamily: F.light,
    fontSize: 32,
    color: C.fgFaint,
    letterSpacing: -1,
  },
  timeDigitActive: {
    color: C.fg,
    fontFamily: F.medium,
  },
  timeColon: {
    fontFamily: F.light,
    fontSize: 32,
    color: C.fgDim,
    marginTop: 6,
    marginHorizontal: 4,
  },
  periodColumn: {
    marginLeft: 24,
    marginTop: 4,
    gap: 4,
  },
  periodCell: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  periodText: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: C.fgFaint,
    letterSpacing: LS.wide,
  },
  periodTextActive: {
    color: C.fg,
  },
  timePreviewWrap: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 18,
  },
  timePreviewLabel: {
    fontFamily: F.medium,
    fontSize: FS.xs,
    color: C.fgFaint,
    letterSpacing: LS.widest,
    marginBottom: 6,
  },
  timePreview: {
    fontFamily: F.light,
    fontSize: 56,
    color: C.fg,
    letterSpacing: -3,
  },
  timePreviewPeriod: {
    fontFamily: F.medium,
    fontSize: 20,
    color: C.fgDim,
    letterSpacing: LS.wide,
  },

  // ─── Name + Payoff ─────────────────────────────────────────
  nameInput: {
    color: C.fg,
    fontSize: 30,
    fontFamily: F.regular,
    paddingVertical: 12,
    paddingHorizontal: 0,
    letterSpacing: -0.3,
  },
  inputRule: {
    height: 1,
    backgroundColor: C.fg,
    marginTop: 4,
  },
  payoffBlock: {
    marginTop: 36,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 20,
  },
  payoffLabel: {
    fontFamily: F.medium,
    fontSize: FS.xs,
    color: C.fgFaint,
    letterSpacing: LS.widest,
    marginBottom: 10,
  },
  payoffLine: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: C.fg,
    marginBottom: 14,
  },
  payoffAccent: {
    color: ACCENT,
  },
  payoffMid: {
    color: C.fgMid,
  },
  payoffBody: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: C.fgMid,
    lineHeight: 24,
    fontStyle: "italic",
  },

  // ─── Bottom bar ────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: SPACE.inputPad,
    paddingBottom: 44,
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: C.fg,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: HAIRLINE,
  },
  nextButtonText: {
    fontFamily: F.regular,
    fontSize: FS.md,
    color: "#000",
    letterSpacing: LS.wider,
    textTransform: "uppercase",
  },
  nextButtonTextDisabled: {
    color: C.fgFaint,
  },
});
