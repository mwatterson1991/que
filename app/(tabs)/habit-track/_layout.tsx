import { Stack } from "expo-router";
import { ROOT } from "@/lib/nav";

// The tab root draws its own collapsing header (components/CollapsingHeader),
// so the native bar is hidden there; the plus lives in the screen as the
// bar's `right`.
export default function HabitsStack() {
  return (
    <Stack screenOptions={ROOT}>
      <Stack.Screen name="index" options={{ ...ROOT, headerShown: false }} />
    </Stack>
  );
}
