import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
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
import { F } from "@/lib/fonts";
import EmptyState from "@/lib/EmptyState";
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

// ─── Session row ─────────────────────────────────────────
function SessionRow({ session }: { session: Session }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/player?id=${session.id}` as any)}
      style={styles.sessionRow}
    >
      <Text style={styles.sessionTitle}>{session.title}</Text>
      <Text style={styles.sessionDescription}>{session.description}</Text>
      <View style={styles.sessionBottom}>
        <Text style={styles.sessionNarrator}>{session.narrator}</Text>
        <Text style={styles.sessionPlays}>{formatPlays(session.plays)}</Text>
        <Text style={styles.sessionDuration}>{formatDuration(session.duration_sec)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────
export default function SearchScreen() {
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

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#71717a" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sessions, topics, goals..."
          placeholderTextColor="#52525b"
          style={styles.searchInput}
        />
      </View>

      {/* Category pills */}
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
              style={[styles.categoryPill, active && styles.categoryPillActive]}
            >
              <Text
                style={[
                  styles.categoryText,
                  active && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color="#f5f5f7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          contentContainerStyle={styles.list}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          ListEmptyComponent={
            query || activeCategory !== "All" ? (
              <EmptyState
                icon="search-outline"
                title="No results"
                subtitle="Try a different search term or category."
              />
            ) : (
              <EmptyState
                icon="musical-notes-outline"
                title="No sessions yet"
                subtitle="Sessions will appear here once your library is set up."
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: 16,
    marginLeft: 10,
    fontFamily: F.regular,
  },

  // Category pills
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
    borderColor: "#3f3f46",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    justifyContent: "center",
  },
  categoryPillActive: {
    backgroundColor: "#f5f5f7",
    borderColor: "#f5f5f7",
  },
  categoryText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontFamily: F.medium,
  },
  categoryTextActive: {
    color: "#000000",
    fontFamily: F.medium,
  },

  // Session rows
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sessionRow: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1c1c1e",
  },
  sessionTitle: {
    color: "#f5f5f7",
    fontSize: 20,
    fontFamily: F.medium,
    marginBottom: 6,
  },
  sessionDescription: {
    color: "#71717a",
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
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
  },
  sessionPlays: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
    marginLeft: 12,
  },
  sessionDuration: {
    color: "#52525b",
    fontSize: 14,
    fontFamily: F.regular,
    marginLeft: "auto",
  },

  // Empty
  emptyText: {
    color: "#52525b",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
    fontFamily: F.regular,
  },
});
