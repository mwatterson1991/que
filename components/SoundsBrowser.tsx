import { useMemo, useState, ReactNode } from "react";
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
import { F, S } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { groupIntoRails } from "@/lib/catalog";
import { usePremium, isLocked } from "@/lib/premium";
import { Glass } from "@/components/Glass";
import AuroraBackground from "@/components/AuroraBackground";
import SessionCard from "@/components/SessionCard";
import ChannelCard from "@/components/ChannelCard";
import {
  CARD_W,
  RAIL_EDGE,
  RAIL_GAP,
  RAIL_TAIL,
  SNAP_INTERVAL,
} from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// One browser, two jobs: the drawer's Sounds screen (tap → player) and
// the alarm editor's picker (tap → select). Same rails, same cards.
//
// Every rail leads with its CHANNEL card and then lists the individual
// SOUND cards, so the two card types always sit side by side and the
// channel promise is the first thing you meet in each shelf.

type RailItem =
  | { kind: "channel"; channel: string; sessions: Session[] }
  | { kind: "session"; session: Session };

// A channel is a promise, not a track: tapping one starts today's
// recording from it. Keyed to the calendar day so the pick is genuinely
// fresh each morning but never reshuffles under you mid-session.
function recordingOfTheDay(list: Session[]): Session | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(Date.now() / 86_400_000) % list.length];
}

export default function SoundsBrowser({
  onPressSession,
  selectedId,
  footer,
  withAurora = true,
  topPad = 0,
}: {
  onPressSession: (session: Session) => void;
  selectedId?: string;
  footer?: ReactNode;
  withAurora?: boolean;
  topPad?: number;
}) {
  const { sessions, loading } = useSessions();
  const { unlocked } = usePremium();
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Locked sessions route to the paywall instead of playing/selecting
  const handlePress = (session: Session) => {
    if (isLocked(session, unlocked)) {
      router.push(`/paywall?id=${session.id}` as any);
    } else {
      onPressSession(session);
    }
  };

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

  const renderRailItem = (item: RailItem) =>
    item.kind === "channel" ? (
      <ChannelCard
        channel={item.channel}
        sessions={item.sessions}
        onPress={() => {
          const pick = recordingOfTheDay(item.sessions);
          if (pick) handlePress(pick);
        }}
      />
    ) : (
      <SessionCard
        session={item.session}
        selected={selectedId !== undefined ? item.session.id === selectedId : undefined}
        locked={isLocked(item.session, unlocked)}
        onPress={handlePress}
      />
    );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {withAurora && <AuroraBackground dim={0.8} />}
      {/* Search bar */}
      <Glass style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#8b8b93" />
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
      </Glass>

      {loading ? (
        <ActivityIndicator color="#f5f5f7" style={{ marginTop: 40 }} />
      ) : query ? (
        // ── Search results: one full-width card per row ──
        <FlatList
          data={searchResults}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              variant="wide"
              selected={selectedId !== undefined ? item.id === selectedId : undefined}
              locked={isLocked(item, unlocked)}
              onPress={handlePress}
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
          {rails.map(([channel, list]) => {
            const items: RailItem[] = [
              { kind: "channel", channel, sessions: list },
              ...list.map((session) => ({ kind: "session" as const, session })),
            ];
            return (
              <View key={channel} style={styles.rail}>
                <Text style={styles.railTitle} maxFontSizeMultiplier={1.4}>
                  {channel}
                </Text>
                <FlatList
                  data={items}
                  horizontal
                  keyExtractor={(item) =>
                    item.kind === "channel" ? `ch:${item.channel}` : item.session.id
                  }
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.railContent}
                  // One swipe = one card. The interval is card + gap, and
                  // the leading gutter matches the first card's offset so
                  // every snap lands flush against the left edge.
                  snapToInterval={SNAP_INTERVAL}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum
                  getItemLayout={(_, index) => ({
                    length: CARD_W,
                    // Offsets are measured from content start, so the
                    // leading gutter counts toward the first card.
                    offset: RAIL_EDGE + SNAP_INTERVAL * index,
                    index,
                  })}
                  renderItem={({ item }) => renderRailItem(item)}
                />
              </View>
            );
          })}
          {footer}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
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
    marginBottom: 24,
  },
  railTitle: {
    color: "#f5f5f7",
    fontSize: S.title,
    fontFamily: F.semibold,
    paddingHorizontal: RAIL_EDGE,
    marginBottom: 12,
  },
  railContent: {
    paddingLeft: RAIL_EDGE,
    paddingRight: RAIL_TAIL,
    gap: RAIL_GAP,
  },

  // Search results
  grid: {
    paddingHorizontal: RAIL_EDGE,
    paddingTop: 8,
    paddingBottom: 32,
  },

  emptyText: {
    color: "#a1a1aa",
    fontSize: S.secondary,
    textAlign: "center",
    marginTop: 40,
    fontFamily: F.regular,
  },
});
