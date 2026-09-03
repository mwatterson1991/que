import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/tokens";

// Five tabs, the way Clock, Music and Fitness are arranged. Each tab is
// its own native stack (see the _layout.tsx beside each index.tsx) so it
// gets a real large-title header that collapses on scroll.
const TAB = [
  { name: "alarms", title: "Alarms", icon: "alarm" },
  { name: "search", title: "Sounds", icon: "musical-notes" },
  { name: "habit-track", title: "Habits", icon: "checkmark-circle" },
  { name: "gratitude", title: "Journal", icon: "book" },
  { name: "profile-page", title: "Progress", icon: "stats-chart" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="alarms"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.labelTertiary,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.separator,
        },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {TAB.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? t.icon : (`${t.icon}-outline` as any)} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
