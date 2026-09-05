import { Stack } from "expo-router";
import { ROOT } from "@/lib/nav";

// The tab root draws its own collapsing header (components/CollapsingHeader),
// so the native bar is hidden there.
export default function GratitudeStack() {
  return (
    <Stack screenOptions={{ ...ROOT, title: "Gratitude" }}>
      <Stack.Screen name="index" options={{ ...ROOT, title: "Gratitude", headerShown: false }} />
    </Stack>
  );
}
