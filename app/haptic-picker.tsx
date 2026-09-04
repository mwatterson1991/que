import { useCallback, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  HAPTIC_PATTERNS,
  getAlarmHaptic,
  previewPattern,
  setAlarmHaptic,
} from "@/lib/haptics";
import { Icon, Row, Screen, Section } from "@/components/ui";
import { C, SP } from "@/lib/tokens";

// The haptic picker, pushed from the alarm sheet. A plain list of the
// patterns; tapping one saves it for this alarm and plays it once so the
// choice can be felt, not just read. `alarm` is the alarm's id, or "new"
// while the alarm is still being created.
export default function HapticPickerScreen() {
  const { alarm } = useLocalSearchParams<{ alarm?: string }>();
  const alarmId = alarm || "new";
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      getAlarmHaptic(alarmId).then((h) => { if (live) setSelected(h); });
      return () => { live = false; };
    }, [alarmId])
  );

  const choose = (id: string) => {
    setSelected(id);
    setAlarmHaptic(alarmId, id);
    previewPattern(id);
  };

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <Section footer="Haptics play when your alarm's session opens on this phone. The lock-screen alarm uses the phone's own vibration.">
          {HAPTIC_PATTERNS.map((p) => {
            const isSelected = selected === p.id;
            return (
              <Row
                key={p.id}
                title={p.name}
                subtitle={p.description}
                onPress={() => choose(p.id)}
                accessory={isSelected ? <Icon name="check" size={20} color={C.accent} /> : "none"}
                accessibilityLabel={`${p.name}, ${p.description}${isSelected ? ", selected" : ""}`}
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
});
