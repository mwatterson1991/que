import { useMemo, useState, ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { artworkFor, groupIntoRails, channelArtwork } from "@/lib/catalog";
import type { Session } from "@/lib/types";

// One browser, two jobs: the drawer's Sounds screen (tap → player) and
// the alarm editor's picker (tap → select). Same rails, same cards.

const CARD_W = 150;
const CARD_H = 150;

function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return `${min} min`;
}

function SessionCard({
  session,
  wide,
  selected,
  onPress,
}: {
  session: Session;
  wide?: boolean;
  selected?: boolean;
  onPress: (session: Session) => void;
}) {
  const width = wide ? undefined : CARD_W;
  return (
    <Pressable
      onPress={() => onPress(session)}
      style={[styles.card, wide && styles.cardWide, { width }]}
      accessibilityRole="button"
      accessibilityState={selected !== undefined ? { selected } : undefined}
      accessibilityLabel={`${session.title}, ${formatDuration(session.duration_sec)}`}
    >
      <View>
        <Image
          source={{ uri: artworkFor(session) }}
          style={[styles.cardArt, wide && styles.cardArtWide, selected && styles.cardArtSelected]}
          resizeMode="cover"
        />
        {selected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={22} color="#f5f5f7" />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {session.title}
      </Text>
      <Text style={styles.cardMeta} maxFontSizeMultiplier={1.4}>
        {formatDuration(session.duration_sec)}
      </Text>
    </Pressable>
  );
}

function ComingSoonCard({ channel }: { channel: string }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={`${channel}, coming soon`}>
      <View>
        <Image
          source={{ uri: channelArtwork(channel) }}
          style={[styles.cardArt, styles.comingSoonArt]}
          resizeMode="cover"
        />
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText} maxFontSizeMultiplier={1.4}>Coming soon</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {channel}
      </Text>
      <Text style={styles.cardMeta} maxFontSizeMultiplier={1.4}>In the works</Text>
    </View>
  );
}

export default function SoundsBrowser({
  onPressSession,
  selectedId,
  footer,
}: {
  onPressSession: (session: Session) => void;
  selectedId?: string;
  footer?: ReactNode;
}) {
  const { sessions, loading } = useSessions();
  const [query, setQuery] = useState("");

  const rails = useMemo(() => groupIntoRails(sessions), [sessions]);

  const searchResults = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#71717a" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sounds, topics, goals..."
          placeholderTextColor="#52525b"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color="#52525b" />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#f5f5f7" style={{ marginTop: 40 }} />
      ) : query ? (
        // ── Search results: grid of cards ──
        <FlatList
          data={searchResults}
          keyExtractor={(s) => s.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              wide
              selected={selectedId !== undefined ? item.id === selectedId : undefined}
              onPress={onPressSession}
            />
          )}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sounds match your search.</Text>
          }
          ListFooterComponent={footer ? <>{footer}</> : null}
        />
      ) : (
        // ── Browse: horizontal rails per channel ──
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.railsScroll}
        >
          {rails.map(([channel, list]) => (
            <View key={channel} style={styles.rail}>
              <Text style={styles.railTitle} maxFontSizeMultiplier={1.4}>{channel}</Text>
              {list.length === 0 ? (
                <View style={styles.railContent}>
                  <ComingSoonCard channel={channel} />
                </View>
              ) : (
                <FlatList
                  data={list}
                  horizontal
                  keyExtractor={(s) => s.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.railContent}
                  renderItem={({ item }) => (
                    <SessionCard
                      session={item}
                      selected={selectedId !== undefined ? item.id === selectedId : undefined}
                      onPress={onPressSession}
                    />
                  )}
                />
              )}
            </View>
          ))}
          {footer}
        </ScrollView>
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
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: "#f5f5f7",
    fontSize: S.body,
    marginLeft: 10,
    fontFamily: F.regular,
  },

  // Rails
  railsScroll: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  rail: {
    marginBottom: 26,
  },
  railTitle: {
    color: "#f5f5f7",
    fontSize: S.title,
    fontFamily: F.semibold,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  railContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Cards
  card: {
    width: CARD_W,
  },
  cardWide: {
    flex: 1,
    maxWidth: "48%",
    marginBottom: 20,
  },
  cardArt: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    backgroundColor: "#1c1c1e",
    marginBottom: 8,
  },
  cardArtWide: {
    width: "100%",
    height: 160,
  },
  cardArtSelected: {
    borderWidth: 2,
    borderColor: "#f5f5f7",
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
  },
  cardTitle: {
    color: "#f5f5f7",
    fontSize: S.secondary,
    fontFamily: F.medium,
    marginBottom: 2,
  },
  cardMeta: {
    color: "#71717a",
    fontSize: S.caption,
    fontFamily: F.regular,
  },

  comingSoonArt: {
    opacity: 0.45,
  },
  comingSoonBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonText: {
    color: "#f5f5f7",
    fontSize: S.micro,
    fontFamily: F.semibold,
    letterSpacing: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },

  // Search results grid
  grid: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  gridRow: {
    justifyContent: "space-between",
  },

  emptyText: {
    color: "#52525b",
    fontSize: S.secondary,
    textAlign: "center",
    marginTop: 40,
    fontFamily: F.regular,
  },
});
