import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { F } from "@/lib/fonts";

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {OPTIONS.map((opt, i) => (
        <Pressable key={i} style={styles.card} accessibilityRole="button" accessibilityLabel={`${opt.title}, ${opt.subtitle}`}>
          <Text style={styles.cardTitle}>{opt.title}</Text>
          <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  card: {
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#f5f5f7",
    fontSize: 18,
    fontFamily: F.bold,
    marginBottom: 6,
  },
  cardSubtitle: {
    color: "#71717a",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: F.regular,
  },
});
