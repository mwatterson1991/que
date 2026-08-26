import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { F, S } from "@/lib/fonts";

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
    <View style={styles.container}>
      <FlatList
        data={OPTIONS}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (item.title === "Gratitude Log") router.push("/gratitude" as any);
              if (item.title === "Habit Tracker") router.push("/habit-track" as any);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${item.subtitle}`}
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1c1c1e",
  },
  row: {
    paddingVertical: 20,
  },
  rowTitle: {
    color: "#f5f5f7",
    fontSize: S.title,
    fontFamily: F.medium,
    marginBottom: 6,
  },
  rowSubtitle: {
    color: "#71717a",
    fontSize: S.secondary,
    fontFamily: F.regular,
    lineHeight: 21,
  },
});
