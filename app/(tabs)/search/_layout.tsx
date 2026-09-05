import { Stack } from "expo-router";
import { ROOT } from "@/lib/nav";

// The tab root draws its own collapsing header (components/CollapsingHeader),
// so the native bar is hidden there.
export default function SoundsStack() {
  return (
    <Stack screenOptions={ROOT}>
      <Stack.Screen name="index" options={{ ...ROOT, headerShown: false }} />
    </Stack>
  );
}
