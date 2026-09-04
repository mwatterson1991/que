import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen, Button, IconButton } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import { setPickedSound } from "@/lib/soundPicker";
import SoundsBrowser from "@/components/SoundsBrowser";

// Alarm sound picker — the same browser as the Sounds tab, in pick
// mode. Tapping a card only SELECTS it (a white tick appears); nothing
// plays until you ask. "Use this sound" hands the choice back to the
// alarm editor; "Preview" opens the player deliberately.

const ACTION_BAR_H = SP.button + SP.lg * 2;

export default function SoundsPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { current } = useLocalSearchParams<{ current?: string }>();
  const [selectedId, setSelectedId] = useState(current || "");

  const useSound = () => {
    if (selectedId) setPickedSound(selectedId);
    router.back();
  };

  const preview = () => {
    if (!selectedId) return;
    router.push(`/player?id=${selectedId}&pick=1` as any);
  };

  const barPad = Math.max(insets.bottom, SP.lg);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Choose Sound",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerBackVisible: false,
          headerLeft: () => <IconButton icon="x" label="Close" onPress={() => router.back()} />,
        }}
      />
      <SoundsBrowser
        selectedId={selectedId}
        onPressSession={(session) => setSelectedId(session.id)}
        bottomInset={ACTION_BAR_H + barPad}
      />

      {/* The one decision on this screen, always within reach. */}
      <View style={[styles.actions, { paddingBottom: barPad }]}>
        <Button
          title="Preview"
          tone="gray"
          icon="play"
          disabled={!selectedId}
          onPress={preview}
          style={styles.preview}
          accessibilityLabel="Preview the selected sound"
        />
        <Button
          title="Use this sound"
          tone="prominent"
          disabled={!selectedId}
          onPress={useSound}
          style={styles.use}
          accessibilityLabel="Use this sound for the alarm"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: SP.md,
    paddingHorizontal: SP.screen,
    paddingTop: SP.lg,
    backgroundColor: C.bg,
  },
  preview: {
    flex: 1,
  },
  use: {
    flex: 2,
  },
});
