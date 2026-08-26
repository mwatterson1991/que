import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect, useNavigation } from "expo-router";
import { useAlarms, useSessions } from "@/lib/useSupabase";
import { consumePickedSound } from "@/lib/soundPicker";
import { scheduleAlarm, cancelAlarm } from "@/lib/alarmScheduler";
import { artworkFor } from "@/lib/catalog";
import { F, S } from "@/lib/fonts";

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
                  fontSize: S.title,
                  fontFamily: F.regular,
                  color: isSelected ? "#f5f5f7" : "#48484a",
                }}
                maxFontSizeMultiplier={1.4}
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
  // Collapsed by default — the sound is the hero; tap the time to adjust it
  const [timeOpen, setTimeOpen] = useState(!existing);
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
    let h = hourIdx + 1;
    if (merIdx === 1 && h < 12) h += 12;
    if (merIdx === 0 && h === 12) h = 0;
    const m = minIdx;

    const fire = new Date();
    fire.setHours(h, m, 0, 0);
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1);

    if (existing) {
      // Cancel old notification before rescheduling
      await cancelAlarm(existing.id);
      const { data: updated } = await update(existing.id, {
        label,
        mantra_id: sessionId,
        next_fire_at: fire.toISOString(),
      });
      if (updated) {
        await scheduleAlarm({
          id: updated.id,
          label: updated.label,
          next_fire_at: updated.next_fire_at,
          mantra_id: updated.mantra_id,
          enabled: updated.enabled,
          repeat_days: updated.repeat_days,
        });
      }
    } else {
      const result = await add({
        label,
        mantra_id: sessionId || "focus",
        next_fire_at: fire.toISOString(),
        repeat_days: [],
        enabled: true,
      });
      const created = result?.data;
      if (created) {
        await scheduleAlarm({
          id: created.id,
          label: created.label,
          next_fire_at: created.next_fire_at,
          mantra_id: created.mantra_id,
          enabled: created.enabled,
          repeat_days: created.repeat_days,
        });
      }
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
        <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="Save alarm">
          <Text style={{ color: "#f5f5f7", fontSize: S.body, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, hourIdx, minIdx, merIdx, label, sessionId]);

  const selectedSession = sessions.find((s) => s.id === sessionId);
  const timeText = `${String(hourIdx + 1).padStart(2, "0")}:${String(minIdx).padStart(2, "0")} ${MERIDIEM[merIdx]}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sound — the hero. What you wake up to comes first. */}
        <Pressable
          onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
          style={styles.heroCard}
          accessibilityRole="button"
          accessibilityLabel={`Wake-up sound, ${selectedSession?.title ?? "none chosen"}. Change sound`}
        >
          {selectedSession ? (
            <Image
              source={{ uri: artworkFor(selectedSession) }}
              style={styles.heroArt}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroArt, styles.heroArtEmpty]}>
              <Ionicons name="musical-notes-outline" size={40} color="#3f3f46" />
            </View>
          )}
          <View style={styles.heroOverlay} pointerEvents="none" />
          <View style={styles.heroTextWrap} pointerEvents="none">
            <Text style={styles.heroKicker} maxFontSizeMultiplier={1.4}>WAKE UP TO</Text>
            <Text style={styles.heroTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {selectedSession?.title ?? "Choose a sound"}
            </Text>
            {selectedSession && (
              <Text style={styles.heroMeta} maxFontSizeMultiplier={1.4}>
                {selectedSession.category} · {Math.round(selectedSession.duration_sec / 60)} min
              </Text>
            )}
          </View>
          <View style={styles.heroChip} pointerEvents="none">
            <Text style={styles.heroChipText}>Change</Text>
          </View>
        </Pressable>

        {/* Time — collapsed row; tap to open the wheel picker */}
        <Pressable
          onPress={() => setTimeOpen((v) => !v)}
          style={styles.timeRow}
          accessibilityRole="button"
          accessibilityLabel={`Alarm time ${timeText}. ${timeOpen ? "Collapse" : "Expand"} time picker`}
          accessibilityState={{ expanded: timeOpen }}
        >
          <Text style={styles.timeLabel}>Time</Text>
          <View style={styles.timeRight}>
            <Text style={styles.timeValue} maxFontSizeMultiplier={1.2}>{timeText}</Text>
            <Ionicons
              name={timeOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#52525b"
            />
          </View>
        </Pressable>
        {timeOpen && (
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHighlight} />
            <View style={styles.pickerColumns}>
              <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={48} />
              <Text style={styles.pickerColon}>:</Text>
              <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={48} />
              <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={48} />
            </View>
          </View>
        )}

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

          {/* Delete */}
          <Pressable
            onPress={deleteAlarm}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel="Delete alarm"
          >
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
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // Sound hero
  heroCard: {
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: "#1c1c1e",
  },
  heroArt: {
    ...StyleSheet.absoluteFillObject,
  },
  heroArtEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  heroTextWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
  },
  heroKicker: {
    color: "rgba(255,255,255,0.65)",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: S.heading,
    fontFamily: F.bold,
  },
  heroMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: S.caption,
    fontFamily: F.regular,
    marginTop: 3,
  },
  heroChip: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroChipText: {
    color: "#f5f5f7",
    fontSize: S.micro,
    fontFamily: F.medium,
  },

  // Time row (collapsed)
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  timeLabel: {
    color: "#f5f5f7",
    fontSize: S.body,
    fontFamily: F.medium,
  },
  timeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeValue: {
    color: "#f5f5f7",
    fontSize: S.display,
    fontFamily: F.light,
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
    fontSize: S.title,
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
    fontSize: S.body,
    fontFamily: F.medium,
  },
  rowValue: {
    color: "#71717a",
    fontSize: S.body,
    fontFamily: F.regular,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowInput: {
    color: "#71717a",
    fontSize: S.body,
    fontFamily: F.regular,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  deleteText: {
    color: "#ff3b30",
    fontSize: S.body,
    fontFamily: F.regular,
  },
});
