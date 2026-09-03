import { useRef, useCallback } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { C, R, TYPE } from "@/lib/tokens";

// Scroll-wheel column for the alarm editor, drawn like a dark UIPickerView:
// regular-weight digits, the selected row on a slightly lighter band.
export const ITEM_H = 40;
export const VISIBLE = 5;

export const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
export const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);
export const MERIDIEM = ["AM", "PM"];

export function WheelColumn({
  data,
  selected,
  onSelect,
  width = 64,
  label = "Value",
}: {
  data: string[];
  selected: number;
  onSelect: (index: number) => void;
  width?: number;
  label?: string;
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
    <View
      style={{ height: ITEM_H * VISIBLE, overflow: "hidden", width }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: data[selected] }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment") {
          onSelect(Math.min(selected + 1, data.length - 1));
        } else if (e.nativeEvent.actionName === "decrement") {
          onSelect(Math.max(selected - 1, 0));
        }
      }}
    >
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
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <Text
              style={[TYPE.picker, { color: index === selected ? C.label : C.labelTertiary }]}
              maxFontSizeMultiplier={1.3}
            >
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

/**
 * The band behind the selected row. Rendered by the screen, absolutely
 * positioned under the columns, with no offsets: Yoga centres an
 * offset-less absolute child by the parent's alignment, which is also how
 * the columns are centred, so the band lands on the middle row.
 */
export function WheelHighlight({ width }: { width: number }) {
  return <View style={[styles.highlight, { width }]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  item: {
    height: ITEM_H,
    justifyContent: "center",
    alignItems: "center",
  },
  highlight: {
    position: "absolute",
    height: ITEM_H,
    alignSelf: "center",
    borderRadius: R.sm,
    backgroundColor: C.fillHigh,
  },
});
