import { Stack } from "expo-router";
import { ROOT } from "@/lib/nav";

export default function GratitudeStack() {
  return <Stack screenOptions={{ ...ROOT, title: "Gratitude" }} />;
}
