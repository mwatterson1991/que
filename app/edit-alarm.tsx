import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect, useNavigation } from "expo-router";
import { useAlarms, useSessions } from "@/lib/useSupabase";
import { consumePickedSound } from "@/lib/soundPicker";
import { ensureNotificationPermission } from "@/lib/permissions";
import { F } from "@/lib/fonts";

// ─── Scroll-wheel column ──────────────────────────────────
const ITEM_H = 40;
const VISIBLE = 5;

function WheelColumn({
  data,
  selected,
  onSelect,
  width = 50,
}: {
  data: string[];
  selected: number;
  onSelect: (index: number) => void;
  width?: number;
}) {
  const listRef = useRef<FlatList<string>>(null);

  const handleScrollEnd = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_H);
      onSelect(Math.max(0, Math.min(idx, data.length - 1)));
    },
    [data.length, onSelect]
  );

  return (
    <View style={{ height: ITEM_H * VISIBLE, overflow: "hidden", width }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        initialScrollIndex={selected}
        getItemLayout={(_, index) => ({
          length: ITEM_H,
          offset: ITEM_H * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isSelected = index === selected;
          return (
            <View style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: F.regular,
                  color: isSelected ? "#f5f5f7" : "#48484a",
                }}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── Data ─────────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MERIDIEM = ["AM", "PM"];

export default function EditAlarmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { alarms, add, update, remove } = useAlarms();
  const { sessions } = useSessions();

  // Find existing alarm data from Supabase
  const existing = alarms.find((a) => a.id === id);
  const existingDate = existing ? new Date(existing.next_fire_at) : new Date();
  const existingHour12 = existingDate.getHours() % 12 || 12;

  const [hourIdx, setHourIdx] = useState(existingHour12 - 1);
  const [minIdx, setMinIdx] = useState(existingDate.getMinutes());
  const [merIdx, setMerIdx] = useState(existingDate.getHours() >= 12 ? 1 : 0);
  const [label, setLabel] = useState(existing?.label || "Alarm");
  const [sessionId, setSessionId] = useState(existing?.mantra_id || "");
  const [soundLabel, setSoundLabel] = useState(() => {
    if (!existing?.mantra_id) return "Choose";
    const s = sessions.find((s) => s.id === existing.mantra_id);
    return s?.title ?? "Choose";
  });

  // Update sound label when sessions load
  useEffect(() => {
    if (sessions.length > 0 && existing?.mantra_id && soundLabel === "Choose") {
      const s = sessions.find((s) => s.id === existing.mantra_id);
      if (s) setSoundLabel(s.title);
    }
  }, [sessions]);

  // Pick up selected sound when returning from sounds screen
  useFocusEffect(
    useCallback(() => {
      const picked = consumePickedSound();
      if (picked) {
        setSessionId(picked);
        const s = sessions.find((s) => s.id === picked);
        setSoundLabel(s?.title ?? "Session");
      }
    }, [sessions])
  );

  const save = async () => {
    const permitted = await ensureNotificationPermission();
    if (!permitted) return;

    let h = hourIdx + 1;
    if (merIdx === 1 && h < 12) h += 12;
    if (merIdx === 0 && h === 12) h = 0;
    const m = minIdx;

    const fire = new Date();
    fire.setHours(h, m, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);

    if (existing) {
      await update(existing.id, {
        label,
        mantra_id: sessionId,
        next_fire_at: fire.toISOString(),
      });
    } else {
      await add({
        label,
        mantra_id: sessionId || "focus",
        next_fire_at: fire.toISOString(),
        repeat_days: [],
        enabled: true,
      });
    }
    router.back();
  };

  const deleteAlarm = async () => {
    if (id) await remove(id);
    router.back();
  };

  // Set up the header
  useEffect(() => {
    navigation.setOptions({
      title: existing ? "Edit Alarm" : "New Alarm",
      headerRight: () => (
        <Pressable onPress={save}>
          <Text style={{ color: "#f5f5f7", fontSize: 17, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, hourIdx, minIdx, merIdx, label, sessionId]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Time picker */}
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHighlight} />
          <View style={styles.pickerColumns}>
            <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={48} />
            <Text style={styles.pickerColon}>:</Text>
            <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={48} />
            <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={48} />
          </View>
        </View>

        {/* Settings rows */}
        <View style={styles.settingsSection}>
          {/* Repeat */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Repeat</Text>
            <Text style={styles.rowValue}>Never</Text>
          </View>
          <View style={styles.rowSep} />

          {/* Label */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Label</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              style={styles.rowInput}
              placeholderTextColor="#52525b"
            />
          </View>
          <View style={styles.rowSep} />

          {/* Sound */}
          <Pressable
            onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>Sound</Text>
            <Text style={styles.rowValue}>{soundLabel}</Text>
          </Pressable>
          <View style={styles.rowSep} />

          {/* Delete */}
          <Pressable onPress={deleteAlarm} style={styles.row}>
            <Text style={styles.deleteText}>Delete Alarm</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // Picker
  pickerContainer: {
    position: "relative",
    marginBottom: 24,
    alignSelf: "center",
  },
  pickerHighlight: {
    position: "absolute",
    top: ITEM_H * 2,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: "#1c1c1e",
    borderRadius: 8,
  },
  pickerColumns: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerColon: {
    fontSize: 20,
    fontFamily: F.regular,
    color: "#f5f5f7",
    marginBottom: 2,
  },

  // Settings
  settingsSection: {
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1c1c1e",
  },
  rowLabel: {
    color: "#f5f5f7",
    fontSize: 16,
    fontFamily: F.medium,
  },
  rowValue: {
    color: "#71717a",
    fontSize: 16,
    fontFamily: F.regular,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowInput: {
    color: "#71717a",
    fontSize: 16,
    fontFamily: F.regular,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  deleteText: {
    color: "#ff3b30",
    fontSize: 16,
    fontFamily: F.regular,
  },
});
