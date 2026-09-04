import { Icon, type IconName } from "@/components/ui";
import { C } from "@/lib/tokens";

export type HabitIconName = IconName;

// WHY derive instead of store: the `habits` table has no `icon` column, and
// adding one means a migration plus an icon picker in the add flow — friction
// for something the title already tells us. A habit called "Morning walk" is
// obviously a walk. So we map title → glyph deterministically: the same title
// always renders the same icon, on every device, with nothing to store or sync.
// If we ever add a real `icon` column, this stays as the fallback.
//
// The glyphs are Feather's: one thin line, the same weight as every other
// glyph in the app. Feather has no food, no dumbbell and no walking figure,
// so a few groups lean on a near neighbour (a sunrise for sunlight, a bolt for
// the gym, a compass for getting outside) rather than reaching for a second
// icon family.

// Multi-word forms first — these only read correctly as a phrase ("cold shower"
// is snow, not water; "make the bed" is a bed, not sleep), and a plain
// substring test on the whole title is the honest way to catch them.
const PHRASES: ReadonlyArray<readonly [string, HabitIconName]> = [
  ["cold shower", "cloud-snow"],
  ["cold plunge", "cloud-snow"],
  ["ice bath", "cloud-snow"],
  ["make the bed", "home"],
  ["lights out", "moon"],
  ["work out", "zap"],
  ["no phone", "smartphone"],
  ["screen time", "smartphone"],
  ["fresh air", "compass"],
  ["get outside", "compass"],
  ["to do", "list"],
];

// Single words, matched as WORD PREFIXES rather than raw substrings — "great"
// must not match "eat", and "create" must not match "eat" either. Prefix
// matching also gets the grammar for free: "meditat" covers meditate and
// meditation, "walk" covers walking, "read" covers reading.
// Order matters: the first group that matches wins, so specific beats generic.
const WORDS: ReadonlyArray<readonly [readonly string[], HabitIconName]> = [
  [["sleep", "bedtime", "asleep"], "moon"],
  [["bed"], "home"],
  [["cold", "ice"], "cloud-snow"],
  [["water", "hydrat", "drink", "shower", "swim"], "droplet"],
  [["run", "jog", "step"], "activity"],
  [["walk", "hike", "outside", "outdoor"], "compass"],
  [["bike", "bicycl", "cycl", "ride"], "navigation"],
  [["read", "page", "chapter"], "book-open"],
  [["meditat", "breath", "mindful", "calm", "stillness", "quiet"], "wind"],
  // No bare "light" here on purpose — it would steal "lights out" from sleep.
  [["sun", "sunlight", "sunshine", "daylight"], "sunrise"],
  [["stretch", "yoga", "mobility", "posture"], "maximize-2"],
  [["phone", "screen", "scroll", "social", "instagram", "tiktok"], "smartphone"],
  [["gym", "workout", "exercise", "lift", "weight", "push", "pullup", "fitness", "train"], "zap"],
  [["journal", "write", "writ", "diary", "note"], "edit-3"],
  // Money before the planning group, or "budget review" lands on a checklist.
  [["money", "budget", "save", "spend", "finance", "invest"], "dollar-sign"],
  [["plan", "todo", "review", "prioriti", "task"], "list"],
  [["gratitude", "grateful", "thank", "kindness", "love", "compliment"], "heart"],
  [["coffee", "tea", "caffeine", "espresso"], "coffee"],
  [["veg", "fruit", "green", "salad", "protein", "sugar"], "shopping-bag"],
  [["eat", "breakfast", "lunch", "dinner", "meal", "cook"], "smile"],
  [["vitamin", "supplement", "medic", "pill", "creatine"], "plus-square"],
  [["floss", "teeth", "brush", "skincare", "clean", "tidy", "wash"], "star"],
  [["music", "guitar", "piano", "sing", "drum", "violin"], "music"],
  [["study", "learn", "language", "spanish", "french", "code", "coding", "book"], "book"],
  [["call", "family", "friend", "text", "message"], "phone"],
  [["pray", "bible", "scripture", "church", "faith"], "feather"],
  [["idea", "brainstorm", "sketch", "draw", "creat", "build", "make"], "pen-tool"],
];

export const DEFAULT_HABIT_ICON: HabitIconName = "circle";

export function iconForHabit(title: string): HabitIconName {
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

// The glyph on its own — no chip, no fill. On the tracker it is white like
// every other glyph in the app; the add screen passes the habit's colour so
// the colour picker still previews something.
export function HabitIcon({
  title,
  color = C.label,
  size = 24,
}: {
  title: string;
  color?: string;
  size?: number;
}) {
  return <Icon name={iconForHabit(title)} size={size} color={color} />;
}
