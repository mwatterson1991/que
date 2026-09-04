import { Stack, useRouter } from "expo-router";
import { ROOT } from "@/lib/nav";
import { IconButton } from "@/components/ui";

// The bar buttons live here, on the navigator, not inside the screen:
// options set from a screen body arrive one frame after the header
// draws, which is the flash you see when switching tabs.
function Moon() {
  const router = useRouter();
  return <IconButton icon="moon" label="Goodnight, wind down for sleep" onPress={() => router.push("/goodnight" as any)} />;
}

function Add() {
  const router = useRouter();
  return <IconButton icon="add" label="Add alarm" size={30} onPress={() => router.push("/alarm-config" as any)} />;
}

export default function AlarmsStack() {
  return (
    <Stack screenOptions={ROOT}>
      <Stack.Screen
        name="index"
        options={{ title: "Alarms", headerLeft: () => <Moon />, headerRight: () => <Add /> }}
      />
    </Stack>
  );
}
