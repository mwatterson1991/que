import { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { C, R, TYPE } from "@/lib/tokens";

let Haptics: any = null;
try { Haptics = require("expo-haptics"); } catch {}

// Scroll-wheel column for the alarm editor, drawn like a dark UIPickerView:
// regular-weight digits, the selected row on a slightly lighter band.
//
// Feel: the highlight and a selection tick follow the wheel on every scroll
// frame — the white digit and the click land the moment a row crosses the
// band, not when the momentum settles. The value is committed to the parent
// only when the wheel stops, so the form never sees the in-between rows.
export const ITEM_H = 36;
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
  const clamp = useCallback(
    (idx: number) => Math.max(0, Math.min(idx, data.length - 1)),
    [data.length]
  );

  // The row under the band right now. Local so it can move at scroll speed
  // without a round trip through the parent's state.
  const [live, setLive] = useState(selected);
  const liveRef = useRef(selected);

  // A change of `selected` that did not come from this wheel (hydrating an
  // existing alarm, VoiceOver increment) moves the wheel to match.
  useEffect(() => {
    if (selected === liveRef.current) return;
    liveRef.current = selected;
    setLive(selected);
    listRef.current?.scrollToOffset({ offset: selected * ITEM_H, animated: false });
  }, [selected]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = clamp(Math.round(e.nativeEvent.contentOffset.y / ITEM_H));
      if (idx === liveRef.current) return;
      liveRef.current = idx;
      setLive(idx);
      Haptics?.selectionAsync?.();
    },
    [clamp]
  );

  const commit = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = clamp(Math.round(e.nativeEvent.contentOffset.y / ITEM_H));
      liveRef.current = idx;
      setLive(idx);
      onSelect(idx);
    },
    [clamp, onSelect]
  );

  // A drag that ends dead on a row never starts momentum, so there is no
  // momentum end to commit on; catch that case here.
  const handleDragEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(vy) < 0.01) commit(e);
    },
    [commit]
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
        extraData={live}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollEndDrag={handleDragEnd}
        onMomentumScrollEnd={commit}
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
              style={[TYPE.picker, { color: index === live ? C.label : C.labelTertiary }]}
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
