import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F } from "@/lib/fonts";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  iconColor?: string;
};

export default function EmptyState({
  icon,
  title,
  subtitle,
  iconColor = "#3f3f46",
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={36} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#15151c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: "#a1a1aa",
    fontSize: 17,
    fontFamily: F.medium,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
    textAlign: "center",
    lineHeight: 20,
  },
});
