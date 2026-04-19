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
import { useColors } from "@/lib/theme";
import { consumePickedSound } from "@/lib/soundPicker";
import { F } from "@/lib/fonts";

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
  const c = useColors();
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
                  color: isSelected ? c.fg : c.fgFaint,
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
  const c = useColors();
  const { alarms, add, update, remove } = useAlarms();
  const { sessions } = useSessions();

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

  useEffect(() => {
    if (sessions.length > 0 && existing?.mantra_id && soundLabel === "Choose") {
      const s = sessions.find((s) => s.id === existing.mantra_id);
      if (s) setSoundLabel(s.title);
    }
  }, [sessions]);

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

  useEffect(() => {
    navigation.setOptions({
      title: existing ? "Edit Alarm" : "New Alarm",
      headerRight: () => (
        <Pressable onPress={save}>
          <Text style={{ color: c.fg, fontSize: 17, fontFamily: F.medium }}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, hourIdx, minIdx, merIdx, label, sessionId, c.fg]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pickerContainer}>
          <View style={[styles.pickerHighlight, { backgroundColor: c.panelMid }]} />
          <View style={styles.pickerColumns}>
            <WheelColumn data={HOURS} selected={hourIdx} onSelect={setHourIdx} width={48} />
            <Text style={[styles.pickerColon, { color: c.fg }]}>:</Text>
            <WheelColumn data={MINUTES} selected={minIdx} onSelect={setMinIdx} width={48} />
            <WheelColumn data={MERIDIEM} selected={merIdx} onSelect={setMerIdx} width={48} />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: c.fg }]}>Repeat</Text>
            <Text style={[styles.rowValue, { color: c.fgDim }]}>Never</Text>
          </View>
          <View style={[styles.rowSep, { backgroundColor: c.borderFaint }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: c.fg }]}>Label</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              style={[styles.rowInput, { color: c.fgDim }]}
              placeholderTextColor={c.fgFaint}
            />
          </View>
          <View style={[styles.rowSep, { backgroundColor: c.borderFaint }]} />

          <Pressable
            onPress={() => router.push(`/sounds?current=${sessionId}` as any)}
            style={styles.row}
          >
            <Text style={[styles.rowLabel, { color: c.fg }]}>Sound</Text>
            <Text style={[styles.rowValue, { color: c.fgDim }]}>{soundLabel}</Text>
          </Pressable>
          <View style={[styles.rowSep, { backgroundColor: c.borderFaint }]} />

          <Pressable onPress={deleteAlarm} style={styles.row}>
            <Text style={[styles.deleteText, { color: c.danger }]}>Delete Alarm</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

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
    borderRadius: 8,
  },
  pickerColumns: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerColon: {
    fontSize: 20,
    fontFamily: F.regular,
    marginBottom: 2,
  },

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
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: F.medium,
  },
  rowValue: {
    fontSize: 16,
    fontFamily: F.regular,
  },
  rowInput: {
    fontSize: 16,
    fontFamily: F.regular,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  deleteText: {
    fontSize: 16,
    fontFamily: F.regular,
  },
});
