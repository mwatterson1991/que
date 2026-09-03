import { View, ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { createAudioPlayer, AudioPlayer } from "expo-audio";
import { fadePlayerTo, releasePlayer } from "@/lib/audio";
import { usePreferences } from "@/lib/useSupabase";
import { AMBIENT_SOUNDS, AMBIENT_ASSETS, AmbientSoundId } from "@/lib/ambient";
import { Screen, Section, Row, IconButton } from "@/components/ui";
import { C, SP } from "@/lib/tokens";

const PREVIEW_VOLUME = 0.4;

const PREVIEW_ASSETS: Record<string, any> = AMBIENT_ASSETS;

export default function AmbientPickerScreen() {
  const router = useRouter();
  const { prefs, update: updatePrefs } = usePreferences();
  const { current } = useLocalSearchParams<{ current?: string }>();

  const [selected, setSelected] = useState<AmbientSoundId>(
    (current as AmbientSoundId) ?? "silence",
  );
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewRef = useRef<AudioPlayer | null>(null);

  // Sync from prefs on load
  useEffect(() => {
    if (prefs?.ambient_sound) {
      setSelected(prefs.ambient_sound as AmbientSoundId);
    }
  }, [prefs?.ambient_sound]);

  // Cleanup preview on unmount (this also covers the native back button)
  useEffect(() => {
    return () => {
      if (previewRef.current) {
        releasePlayer(previewRef.current);
        previewRef.current = null;
      }
    };
  }, []);

  const stopPreview = async () => {
    if (previewRef.current) {
      releasePlayer(previewRef.current);
      previewRef.current = null;
    }
    setPreviewing(null);
  };

  const togglePreview = async (id: AmbientSoundId) => {
    if (previewing === id) {
      await stopPreview();
      return;
    }
    await stopPreview();
    if (id === "silence") return;

    const asset = PREVIEW_ASSETS[id];
    if (!asset) return;

    const player = createAudioPlayer(asset);
    player.loop = true;
    player.volume = 0;
    player.play();
    fadePlayerTo(player, PREVIEW_VOLUME, 1200);
    previewRef.current = player;
    setPreviewing(id);
  };

  const handleSelect = async (id: AmbientSoundId) => {
    setSelected(id);
    await stopPreview();
    await updatePrefs({ ambient_sound: id });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Ambient Sound" }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <Section footer="Plays underneath every session at 20% volume. Pick the atmosphere that helps you settle in.">
          {AMBIENT_SOUNDS.map((entry) => {
            const isSelected = selected === entry.id;
            const isPreviewing = previewing === entry.id;
            return (
              <Row
                key={entry.id}
                icon={entry.icon as keyof typeof Ionicons.glyphMap}
                iconColor={isSelected ? C.accent : C.labelSecondary}
                title={entry.label}
                subtitle={entry.description}
                onPress={() => handleSelect(entry.id)}
                accessibilityLabel={`${entry.label}, ${entry.description}${isSelected ? ", selected" : ""}`}
                accessory={
                  <View style={styles.accessory}>
                    {entry.id !== "silence" && (
                      <IconButton
                        icon={isPreviewing ? "stop" : "play"}
                        size={20}
                        label={isPreviewing ? `Stop preview of ${entry.label}` : `Preview ${entry.label}`}
                        onPress={() => togglePreview(entry.id)}
                      />
                    )}
                    <View style={styles.check}>
                      {isSelected && <Ionicons name="checkmark" size={22} color={C.accent} />}
                    </View>
                  </View>
                }
              />
            );
          })}
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SP.xxxl,
  },
  accessory: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SP.sm,
  },
  check: {
    width: SP.xxl,
    alignItems: "flex-end",
  },
});
