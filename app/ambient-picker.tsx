import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import { F } from "@/lib/fonts";
import { usePreferences } from "@/lib/useSupabase";
import {
  AMBIENT_SOUNDS,
  AmbientSoundId,
  AmbientSoundEntry,
} from "@/lib/ambient";

const PREVIEW_VOLUME = 0.4;

const PREVIEW_ASSETS: Record<string, any> = {
  "theta-binaural": require("../assets/audio/ambient-theta.wav"),
  "soft-rain": require("../assets/audio/ambient-noise.wav"),
};

export default function AmbientPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prefs, update: updatePrefs } = usePreferences();
  const { current } = useLocalSearchParams<{ current?: string }>();

  const [selected, setSelected] = useState<AmbientSoundId>(
    (current as AmbientSoundId) ?? "silence",
  );
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewRef = useRef<Audio.Sound | null>(null);

  // Sync from prefs on load
  useEffect(() => {
    if (prefs?.ambient_sound) {
      setSelected(prefs.ambient_sound as AmbientSoundId);
    }
  }, [prefs?.ambient_sound]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      previewRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const stopPreview = async () => {
    if (previewRef.current) {
      try {
        await previewRef.current.stopAsync();
        await previewRef.current.unloadAsync();
      } catch {}
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

    const { sound } = await Audio.Sound.createAsync(asset, {
      shouldPlay: true,
      isLooping: true,
      volume: PREVIEW_VOLUME,
    });
    previewRef.current = sound;
    setPreviewing(id);
  };

  const handleSelect = async (id: AmbientSoundId) => {
    setSelected(id);
    await stopPreview();
    await updatePrefs({ ambient_sound: id });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { stopPreview(); router.back(); }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color="#f5f5f7" />
        </Pressable>
        <Text style={styles.headerTitle}>Ambient Sound</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.subtitle}>
        Plays underneath every session at 20% volume. Pick the atmosphere that helps you settle in.
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {AMBIENT_SOUNDS.map((entry) => (
          <AmbientRow
            key={entry.id}
            entry={entry}
            isSelected={selected === entry.id}
            isPreviewing={previewing === entry.id}
            onPreview={() => togglePreview(entry.id)}
            onSelect={() => handleSelect(entry.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function AmbientRow({
  entry,
  isSelected,
  isPreviewing,
  onPreview,
  onSelect,
}: {
  entry: AmbientSoundEntry;
  isSelected: boolean;
  isPreviewing: boolean;
  onPreview: () => void;
  onSelect: () => void;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`${entry.label}, ${entry.description}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconCircle, isSelected && styles.iconCircleActive]}>
          <Ionicons
            name={entry.icon as any}
            size={20}
            color={isSelected ? "#f5f5f7" : "#71717a"}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, isSelected && styles.rowLabelActive]}>
            {entry.label}
          </Text>
          <Text style={styles.rowDesc}>{entry.description}</Text>
        </View>
      </View>

      <View style={styles.rowRight}>
        {entry.id !== "silence" && (
          <Pressable
            style={styles.previewBtn}
            onPress={onPreview}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isPreviewing ? `Stop preview of ${entry.label}` : `Preview ${entry.label}`}
          >
            <Ionicons
              name={isPreviewing ? "stop" : "play"}
              size={16}
              color="#FF5500"
            />
          </Pressable>
        )}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#FF5500" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "#f5f5f7",
    fontSize: 18,
    fontFamily: F.bold,
  },
  subtitle: {
    color: "#71717a",
    fontSize: 14,
    fontFamily: F.regular,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2c2c2e",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconCircleActive: {
    backgroundColor: "#3a1800",
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: "#f5f5f7",
    fontSize: 16,
    fontFamily: F.medium,
  },
  rowLabelActive: {
    color: "#FF5500",
  },
  rowDesc: {
    color: "#71717a",
    fontSize: 13,
    fontFamily: F.regular,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
  },
});
