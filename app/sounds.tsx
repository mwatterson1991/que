import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { setPickedSound } from "@/lib/soundPicker";
import { F } from "@/lib/fonts";
import { useColors } from "@/lib/theme";
import { useSessions } from "@/lib/useSupabase";
import type { Session } from "@/lib/types";

const CATEGORIES = ["All", "Sleep", "Confidence", "Addiction", "Anxiety", "Mindfulness"];

function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

function formatPlays(plays: number) {
  return plays.toLocaleString();
}

function SessionRow({
  session,
  isSelected,
  onSelect,
}: {
  session: Session;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onSelect} style={[styles.sessionRow, { borderBottomColor: c.borderFaint }]}>
      <View style={styles.sessionContent}>
        <Text style={[styles.sessionTitle, { color: c.fg }]}>{session.title}</Text>
        <Text style={[styles.sessionDescription, { color: c.fgDim }]}>{session.description}</Text>
        <View style={styles.sessionBottom}>
          <Text style={[styles.sessionNarrator, { color: c.fgFaint }]}>{session.narrator}</Text>
          <Text style={[styles.sessionPlays, { color: c.fgFaint }]}>{formatPlays(session.plays)}</Text>
          <Text style={[styles.sessionDuration, { color: c.fgFaint }]}>{formatDuration(session.duration_sec)}</Text>
        </View>
      </View>
      {isSelected && (
        <Ionicons
          name="checkmark"
          size={22}
          color={c.alarm}
          style={styles.checkmark}
        />
      )}
    </Pressable>
  );
}

export default function SoundsScreen() {
  const router = useRouter();
  const c = useColors();
  const { current } = useLocalSearchParams<{ current: string }>();
  const { sessions, loading } = useSessions();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesCategory =
        activeCategory === "All" || s.category === activeCategory;
      const matchesQuery =
        !query ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [sessions, activeCategory, query]);

  const handleSelect = (id: string) => {
    setPickedSound(id);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgDeep }]}>
      <View style={[styles.searchBar, { backgroundColor: c.panelMid }]}>
        <Ionicons name="search" size={18} color={c.fgDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sessions, topics, goals..."
          placeholderTextColor={c.fgFaint}
          style={[styles.searchInput, { color: c.fg }]}
        />
      </View>

      <View style={styles.pillWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.categoryPill,
                  { borderColor: c.borderMid },
                  active && { backgroundColor: c.fg, borderColor: c.fg },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: c.fgMid },
                    active && { color: c.fgInverted },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={c.fg} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SessionRow
              session={item}
              isSelected={item.id === current}
              onSelect={() => handleSelect(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: c.fgFaint }]}>No sessions match your search.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    fontFamily: F.regular,
  },

  pillWrapper: {
    height: 44,
    marginBottom: 12,
  },
  pillScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    height: 44,
  },
  categoryPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 14,
    fontFamily: F.medium,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 20,
    fontFamily: F.bold,
    marginBottom: 6,
  },
  sessionDescription: {
    fontSize: 15,
    fontFamily: F.regular,
    lineHeight: 21,
    marginBottom: 16,
  },
  sessionBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionNarrator: {
    fontSize: 14,
    fontFamily: F.regular,
  },
  sessionPlays: {
    fontSize: 14,
    fontFamily: F.regular,
    marginLeft: 12,
  },
  sessionDuration: {
    fontSize: 14,
    fontFamily: F.regular,
    marginLeft: "auto",
  },
  checkmark: {
    marginTop: 4,
    marginLeft: 12,
  },

  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
    fontFamily: F.regular,
  },
});
