import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui";
import SoundsBrowser from "@/components/SoundsBrowser";

// Alarm sound picker — the exact same browser as the Sounds tab, but
// tapping a card selects it for the alarm and returns. The "Choose
// Sound" title comes from the root stack.
export default function SoundsPickerScreen() {
  const router = useRouter();
  const { current } = useLocalSearchParams<{ current?: string }>();

  return (
    <Screen>
      <SoundsBrowser
        selectedId={current || ""}
        onPressSession={(session) =>
          router.push(`/player?id=${session.id}&pick=1` as any)
        }
      />
    </Screen>
  );
}
