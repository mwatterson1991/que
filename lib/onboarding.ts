import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_COMPLETED = "@que_onboarding_complete";
const KEY_GOAL = "@que_primary_goal";
const KEY_WAKE_TIME = "@que_wake_time";

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
