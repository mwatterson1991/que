import type { ComponentProps } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R } from "@/lib/tokens";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// WHY derive instead of store: the `habits` table has no `icon` column, and
// adding one means a migration plus an icon picker in the add flow — friction
// for something the title already tells us. A habit called "Morning walk" is
// obviously a walk. So we map title → glyph deterministically: the same title
// always renders the same icon, on every device, with nothing to store or sync.
// If we ever add a real `icon` column, this stays as the fallback.

// Multi-word forms first — these only read correctly as a phrase ("cold shower"
// is snow, not water; "make the bed" is a bed, not sleep), and a plain
// substring test on the whole title is the honest way to catch them.
const PHRASES: ReadonlyArray<readonly [string, IoniconName]> = [
  ["cold shower", "snow-outline"],
  ["cold plunge", "snow-outline"],
  ["ice bath", "snow-outline"],
  ["make the bed", "bed-outline"],
  ["lights out", "moon-outline"],
  ["work out", "barbell-outline"],
  ["no phone", "phone-portrait-outline"],
  ["screen time", "phone-portrait-outline"],
  ["fresh air", "walk-outline"],
  ["get outside", "walk-outline"],
  ["to do", "list-outline"],
];

// Single words, matched as WORD PREFIXES rather than raw substrings — "great"
// must not match "eat", and "create" must not match "eat" either. Prefix
// matching also gets the grammar for free: "meditat" covers meditate and
// meditation, "walk" covers walking, "read" covers reading.
// Order matters: the first group that matches wins, so specific beats generic.
const WORDS: ReadonlyArray<readonly [readonly string[], IoniconName]> = [
  [["sleep", "bedtime", "asleep"], "moon-outline"],
  [["bed"], "bed-outline"],
  [["cold", "ice"], "snow-outline"],
  [["water", "hydrat", "drink", "shower", "swim"], "water-outline"],
  [["walk", "run", "jog", "step", "hike", "outside", "outdoor"], "walk-outline"],
  [["bike", "bicycl", "cycl", "ride"], "bicycle-outline"],
  [["read", "book", "page", "chapter"], "book-outline"],
  [["meditat", "breath", "mindful", "calm", "stillness", "quiet"], "leaf-outline"],
  // No bare "light" here on purpose — it would steal "lights out" from sleep.
  [["sun", "sunlight", "sunshine", "daylight"], "sunny-outline"],
  [["stretch", "yoga", "mobility", "posture"], "body-outline"],
  [["phone", "screen", "scroll", "social", "instagram", "tiktok"], "phone-portrait-outline"],
  [["gym", "workout", "exercise", "lift", "weight", "push", "pullup", "fitness", "train"], "barbell-outline"],
  [["journal", "write", "writ", "diary", "note"], "create-outline"],
  // Money before the planning group, or "budget review" lands on a checklist.
  [["money", "budget", "save", "spend", "finance", "invest"], "wallet-outline"],
  [["plan", "todo", "review", "prioriti", "task"], "list-outline"],
  [["gratitude", "grateful", "thank", "kindness", "love", "compliment"], "heart-outline"],
  [["coffee", "tea", "caffeine", "espresso"], "cafe-outline"],
  [["veg", "fruit", "green", "salad", "protein", "sugar"], "nutrition-outline"],
  [["eat", "breakfast", "lunch", "dinner", "meal", "cook"], "restaurant-outline"],
  [["vitamin", "supplement", "medic", "pill", "creatine"], "medkit-outline"],
  [["floss", "teeth", "brush", "skincare", "clean", "tidy", "wash"], "sparkles-outline"],
  [["music", "guitar", "piano", "sing", "drum", "violin"], "musical-notes-outline"],
  [["study", "learn", "language", "spanish", "french", "code", "coding"], "school-outline"],
  [["call", "family", "friend", "text", "message"], "call-outline"],
  [["pray", "bible", "scripture", "church", "faith"], "hand-left-outline"],
  [["idea", "brainstorm", "sketch", "draw", "creat", "build", "make"], "bulb-outline"],
];

export const DEFAULT_HABIT_ICON: IoniconName = "checkmark-circle-outline";

export function iconForHabit(title: string): IoniconName {
  const lower = title.toLowerCase();

  for (const [phrase, icon] of PHRASES) {
    if (lower.includes(phrase)) return icon;
  }

  // Split on anything that isn't a letter so "push-ups", "10 pages" and
  // "don't scroll" all tokenize the way a reader would say them.
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  for (const [keys, icon] of WORDS) {
    if (words.some((w) => keys.some((k) => w.startsWith(k)))) return icon;
  }

  return DEFAULT_HABIT_ICON;
}

// The chip the icon lives in — shared by the tracker and the add screen so a
// habit looks identical wherever it appears. The chip is a raised system fill;
// the habit's own colour is carried by the glyph alone, the way a tinted
// SF Symbol sits in a Settings row.
export function HabitIcon({
  title,
  color,
  size = 38,
}: {
  title: string;
  color: string;
  size?: number;
}) {
  return (
    <View style={[styles.chip, { width: size, height: size }]}>
      <Ionicons name={iconForHabit(title)} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: R.pill,
    backgroundColor: C.fillHigh,
  },
});
