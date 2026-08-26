import { useRouter, useLocalSearchParams } from "expo-router";
import SoundsBrowser from "@/components/SoundsBrowser";

// Alarm sound picker — the exact same browser as the Sounds screen,
// but tapping a card selects it for the alarm and returns.
export default function SoundsPickerScreen() {
  const router = useRouter();
  const { current } = useLocalSearchParams<{ current?: string }>();

  return (
    <SoundsBrowser
      selectedId={current || ""}
      onPressSession={(session) =>
        router.push(`/player?id=${session.id}&pick=1` as any)
      }
    />
  );
}
