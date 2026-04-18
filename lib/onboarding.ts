import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_COMPLETED = "@que_onboarding_complete";
const KEY_GOAL = "@que_primary_goal";
const KEY_WAKE_TIME = "@que_wake_time";
const KEY_HYPNO = "@que_hypnotizability";
const KEY_GOAL_CONTEXT = "@que_goal_context";

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY_COMPLETED);
  return val === "true";
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEY_COMPLETED, "true");
}

export async function setPrimaryGoal(goal: string): Promise<void> {
  await AsyncStorage.setItem(KEY_GOAL, goal);
}

export async function getPrimaryGoal(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_GOAL);
}

export async function setWakeTime(hour: number, minute: number): Promise<void> {
  await AsyncStorage.setItem(KEY_WAKE_TIME, JSON.stringify({ hour, minute }));
}

export async function getWakeTime(): Promise<{ hour: number; minute: number } | null> {
  const val = await AsyncStorage.getItem(KEY_WAKE_TIME);
  if (!val) return null;
  return JSON.parse(val);
}

export async function setHypnotizability(answer: string): Promise<void> {
  await AsyncStorage.setItem(KEY_HYPNO, answer);
}

export async function getHypnotizability(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_HYPNO);
}

export async function setGoalContext(answer: string): Promise<void> {
  await AsyncStorage.setItem(KEY_GOAL_CONTEXT, answer);
}

export async function getGoalContext(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_GOAL_CONTEXT);
}

export const GOALS = [
  { id: "focus", label: "Deep Focus", description: "Sharpen concentration and build flow" },
  { id: "procrastination", label: "Beat Procrastination", description: "Stop putting things off" },
  { id: "anxiety", label: "Reduce Anxiety", description: "Find calm in the noise" },
  { id: "confidence", label: "Build Confidence", description: "Strengthen self-belief" },
  { id: "sleep", label: "Better Sleep", description: "Fall asleep faster, stay asleep longer" },
  { id: "addiction", label: "Break a Habit", description: "Quit vaping, scrolling, or overeating" },
  { id: "exercise", label: "Exercise Habit", description: "Make movement non-negotiable" },
  { id: "gratitude", label: "Gratitude", description: "Start each day grateful" },
  { id: "recovery", label: "Recovery", description: "Stay grounded in sobriety" },
  { id: "general", label: "Morning Mindset", description: "Own your morning, own your day" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];

// ─── Hypnotizability answer choices ───────────────────────────────────────

export const HYPNO_CHOICES = [
  { id: "never", label: "Never tried it." },
  { id: "tried", label: "Once — not sure if it worked." },
  { id: "worked", label: "Yes, and it worked." },
  { id: "doubt", label: "I don't think I'd be hypnotizable." },
] as const;

// ─── Goal-specific follow-up question map ─────────────────────────────────
// Each goal gets ONE sharp follow-up. The answer becomes goal_context used
// later by session-generation prompts to personalize audio scripts.

export type GoalContextChoice = { id: string; label: string };

export type GoalContextQuestion = {
  prompt: string;
  choices: readonly GoalContextChoice[];
};

export const GOAL_CONTEXT: Record<GoalId, GoalContextQuestion> = {
  focus: {
    prompt: "When's your focus at its worst?",
    choices: [
      { id: "morning", label: "Right after waking" },
      { id: "midmorning", label: "Mid-morning slump" },
      { id: "afternoon", label: "After lunch" },
      { id: "evening", label: "End of the day" },
    ],
  },
  procrastination: {
    prompt: "What's the thing you keep putting off?",
    choices: [
      { id: "work", label: "Work or career" },
      { id: "health", label: "Health or fitness" },
      { id: "project", label: "A side project" },
      { id: "personal", label: "Something personal" },
    ],
  },
  anxiety: {
    prompt: "When does anxiety hit hardest?",
    choices: [
      { id: "morning", label: "First thing in the morning" },
      { id: "work", label: "At work" },
      { id: "social", label: "In social situations" },
      { id: "night", label: "Right before sleep" },
    ],
  },
  confidence: {
    prompt: "Where do you feel least confident?",
    choices: [
      { id: "work", label: "At work" },
      { id: "social", label: "Socially" },
      { id: "relationships", label: "In relationships" },
      { id: "internal", label: "In your own head" },
    ],
  },
  sleep: {
    prompt: "What keeps you up most?",
    choices: [
      { id: "racing", label: "Racing thoughts" },
      { id: "waking", label: "Waking up at night" },
      { id: "falling", label: "Can't fall asleep" },
      { id: "early", label: "Waking too early" },
    ],
  },
  addiction: {
    prompt: "What are you breaking?",
    choices: [
      { id: "nicotine", label: "Vaping or nicotine" },
      { id: "alcohol", label: "Alcohol" },
      { id: "sugar", label: "Sugar or food" },
      { id: "phone", label: "Phone or scrolling" },
    ],
  },
  exercise: {
    prompt: "What stops you most?",
    choices: [
      { id: "time", label: "No time" },
      { id: "energy", label: "No energy" },
      { id: "motivation", label: "No motivation" },
      { id: "plan", label: "Don't know what to do" },
    ],
  },
  gratitude: {
    prompt: "When you feel off, what do you tend to focus on?",
    choices: [
      { id: "wrong", label: "What's going wrong" },
      { id: "missing", label: "What's missing" },
      { id: "others", label: "What others have" },
      { id: "judgment", label: "What people think of you" },
    ],
  },
  recovery: {
    prompt: "How long in recovery?",
    choices: [
      { id: "day1", label: "Day one" },
      { id: "month", label: "Under a month" },
      { id: "months", label: "Several months" },
      { id: "years", label: "Years in" },
    ],
  },
  general: {
    prompt: "How do your mornings usually feel?",
    choices: [
      { id: "rushed", label: "Rushed" },
      { id: "groggy", label: "Groggy" },
      { id: "okay", label: "Okay-ish" },
      { id: "stressed", label: "Already stressed" },
    ],
  },
};
