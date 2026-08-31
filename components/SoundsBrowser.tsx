import { useMemo, useState, useCallback, ReactNode } from "react";
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
import { Glass, TEXT_ON_IMAGE } from "@/components/Glass";
import AuroraBackground from "@/components/AuroraBackground";
import SessionCard from "@/components/SessionCard";
import ChannelCard from "@/components/ChannelCard";
import { useBackdrop } from "@/lib/backdrop";
import {
  CARD_W,
  RAIL_EDGE,
  RAIL_GAP,
  RAIL_TAIL,
  SNAP_INTERVAL,
  quantizeLight,
} from "@/components/cardLayout";
import type { Session } from "@/lib/types";

// One browser, two jobs: the drawer's Sounds screen (tap → player) and
// the alarm editor's picker (tap → select). Same rails, same cards.
//
// Every rail leads with its CHANNEL card and then lists the individual
// SOUND cards, so the two card types always sit side by side and the
// channel promise is the first thing you meet in each shelf.
//
// The background of this screen is the app's animated gradient and
// nothing else. This screen used to blow the focused card's photograph
// up behind everything and crossfade it as you swiped; Michael's call
// is that an app backed by a photograph doesn't read as serious
// software, so the photographs now live only ON the cards. The sense of
// the mood moving as you scroll comes from the cards' own per-channel
// tint instead — see toneFor in cardLayout.

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

// ─── One channel shelf ─────────────────────────────────────

function Rail({
  channel,
  items,
  renderItem,
}: {
  channel: string;
  items: RailItem[];
  renderItem: (item: RailItem, index: number) => ReactNode;
}) {
  return (
    <View style={styles.rail}>
      <Text style={styles.railLabel} maxFontSizeMultiplier={1.4}>
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
        // Every card carries a live glass shimmer and a photograph, so
        // keep the mounted window tight — about two cards either side of
        // the one you're looking at.
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        getItemLayout={(_, index) => ({
          length: CARD_W,
          // Offsets are measured from content start, so the
          // leading gutter counts toward the first card.
          offset: RAIL_EDGE + SNAP_INTERVAL * index,
          index,
        })}
        renderItem={({ item, index }) => <>{renderItem(item, index)}</>}
      />
    </View>
  );
}

// ─── Browser ───────────────────────────────────────────────

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

  // The user's gradient is theirs — we read the house-lights level so
  // the cards' tint dims with it, and touch nothing else. Quantised
  // because wind-down steps the level every five seconds and the cards
  // are memoised on this value.
  const { level } = useBackdrop();
  const light = quantizeLight(level);

  // Locked sessions route to the paywall instead of playing/selecting.
  // Stable identity so a card only re-renders when its own data moves.
  const handlePress = useCallback(
    (session: Session) => {
      if (isLocked(session, unlocked)) {
        router.push(`/paywall?id=${session.id}` as any);
      } else {
        onPressSession(session);
      }
    },
    [unlocked, router, onPressSession],
  );

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

  const renderRailItem = (item: RailItem, index: number) =>
    item.kind === "channel" ? (
      <ChannelCard
        channel={item.channel}
        sessions={item.sessions}
        index={index}
        light={light}
        onPress={() => {
          const pick = recordingOfTheDay(item.sessions);
          if (pick) handlePress(pick);
        }}
      />
    ) : (
      <SessionCard
        session={item.session}
        index={index}
        light={light}
        selected={selectedId !== undefined ? item.session.id === selectedId : undefined}
        locked={isLocked(item.session, unlocked)}
        onPress={handlePress}
      />
    );

  return (
    <View style={styles.container}>
      {withAurora && <AuroraBackground dim={0.8} />}

      <View style={[styles.content, { paddingTop: topPad }]}>
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
          // ── Search results: one full-width row per result ──
          <FlatList
            data={searchResults}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <SessionCard
                session={item}
                variant="wide"
                index={index}
                light={light}
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
            {rails.map(([channel, list]) => (
              <Rail
                key={channel}
                channel={channel}
                items={[
                  { kind: "channel", channel, sessions: list },
                  ...list.map((session) => ({ kind: "session" as const, session })),
                ]}
                renderItem={renderRailItem}
              />
            ))}
            {footer}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
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
    marginBottom: 22,
  },
  // A quiet marker for the shelf, not a headline. The big type on this
  // screen belongs to the card — the reference players Michael keeps
  // sending have one title, and it's on the panel. A second 28pt
  // heading directly above every card was two titles for one thing.
  railLabel: {
    color: "rgba(245,245,247,0.66)",
    fontSize: S.secondary,
    fontFamily: F.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: RAIL_EDGE,
    marginBottom: 10,
    ...TEXT_ON_IMAGE,
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
