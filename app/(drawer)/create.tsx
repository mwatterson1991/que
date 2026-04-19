import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { F } from "@/lib/fonts";
import { useColors } from "@/lib/theme";

const OPTIONS = [
  {
    title: "Gratitude Log",
    subtitle: "Record what you're grateful for today",
  },
  {
    title: "Habit Tracker",
    subtitle: "Track a habit or goal",
  },
  {
    title: "Journal Entry",
    subtitle: "Free-form thought capture",
  },
  {
    title: "Custom Session",
    subtitle: "Generate a personalized audio session with AI",
  },
];

export default function CreateScreen() {
  const router = useRouter();
  const c = useColors();

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bgDeep }]} contentContainerStyle={styles.scroll}>
      {OPTIONS.map((opt, i) => (
        <Pressable key={i} style={[styles.card, { borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.fg }]}>{opt.title}</Text>
          <Text style={[styles.cardSubtitle, { color: c.fgDim }]}>{opt.subtitle}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: F.bold,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: F.regular,
  },
});
