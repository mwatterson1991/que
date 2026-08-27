import { useRef, useCallback } from "react";
import { View, Text, FlatList } from "react-native";
import { F, S } from "@/lib/fonts";

// Scroll-wheel column shared by the alarm editor surfaces.
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
  width = 50,
  label = "Value",
  light = false,
}: {
  data: string[];
  selected: number;
  onSelect: (index: number) => void;
  width?: number;
  label?: string;
  light?: boolean;
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
        renderItem={({ item, index }) => {
          const isSelected = index === selected;
          return (
            <View style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: S.title,
                  fontFamily: F.regular,
                  color: isSelected
                    ? "#ffffff"
                    : light
                      ? "rgba(255,255,255,0.35)"
                      : "#48484a",
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
