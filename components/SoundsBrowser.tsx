import { useMemo, useState, useCallback, ReactNode } from "react";
import { useRouter } from "expo-router";
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt, Empty } from "@/components/ui";
import { C, R, SP, TYPE } from "@/lib/tokens";
import { useSessions } from "@/lib/useSupabase";
import { groupIntoRails } from "@/lib/catalog";
import { usePremium, isLocked } from "@/lib/premium";
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

// One browser, two jobs: the Sounds tab (tap → player) and the alarm
// editor's picker (tap → select). Same rails, same tiles.
//
// Every rail leads with its CHANNEL card and then lists the individual
// SOUND cards, so the two card types always sit side by side and the
// channel promise is the first thing you meet in each shelf.
//
// One vertical FlatList carries both modes — shelves while browsing, a
// column of wide tiles while searching — with the search field as its
// header, so the field never remounts (and never drops the keyboard)
// when the first character is typed.

type RailItem =
  | { kind: "channel"; channel: string; sessions: Session[] }
  | { kind: "session"; session: Session };

type ListItem =
  | { kind: "rail"; channel: string; sessions: Session[] }
  | { kind: "result"; session: Session };

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
  renderItem: (item: RailItem) => ReactNode;
}) {
  return (
    <View style={styles.rail}>
      <Txt kind="headline" style={styles.railLabel} maxFontSizeMultiplier={1.4}>
        {channel}
      </Txt>
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
        // Every card carries a photograph, so keep the mounted window
        // tight — about two cards either side of the one in view.
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
        renderItem={({ item }) => <>{renderItem(item)}</>}
      />
    </View>
  );
}

// ─── Browser ───────────────────────────────────────────────

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
  const { unlocked } = usePremium();
  const router = useRouter();
  const [query, setQuery] = useState("");

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

  const items = useMemo<ListItem[]>(
    () =>
      query
        ? searchResults.map((session) => ({ kind: "result" as const, session }))
        : rails.map(([channel, list]) => ({ kind: "rail" as const, channel, sessions: list })),
    [query, searchResults, rails],
  );

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

  const renderItem = ({ item }: { item: ListItem }) =>
    item.kind === "rail" ? (
      <Rail
        channel={item.channel}
        items={[
          { kind: "channel", channel: item.channel, sessions: item.sessions },
          ...item.sessions.map((session) => ({ kind: "session" as const, session })),
        ]}
        renderItem={renderRailItem}
      />
    ) : (
      <View style={styles.result}>
        <SessionCard
          session={item.session}
          variant="wide"
          selected={selectedId !== undefined ? item.session.id === selectedId : undefined}
          locked={isLocked(item.session, unlocked)}
          onPress={handlePress}
        />
      </View>
    );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => (item.kind === "rail" ? `rail:${item.channel}` : item.session.id)}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={C.labelSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search sounds, topics, goals"
            placeholderTextColor={C.labelTertiary}
            selectionColor={C.accent}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="never"
            accessibilityLabel="Search sounds"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={C.labelSecondary} />
            </Pressable>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={C.labelSecondary} style={styles.loading} />
        ) : query ? (
          <View style={styles.empty}>
            <Empty title="No Results" body="No sounds match your search." />
          </View>
        ) : null
      }
      ListFooterComponent={footer ? <>{footer}</> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: SP.xxxl,
  },

  // Search field, drawn like UISearchBar's: a rounded fill with the
  // glyph inside it.
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    marginHorizontal: SP.screen,
    marginTop: SP.sm,
    marginBottom: SP.xl,
    paddingHorizontal: SP.sm,
    height: 36,
    borderRadius: R.md,
    backgroundColor: C.fill,
  },
  searchInput: {
    ...TYPE.body,
    flex: 1,
    color: C.label,
    paddingVertical: 0,
  },

  // Rails
  rail: {
    marginBottom: SP.xxl,
  },
  railLabel: {
    paddingHorizontal: SP.screen,
    marginBottom: SP.sm,
  },
  railContent: {
    paddingLeft: RAIL_EDGE,
    paddingRight: RAIL_TAIL,
    gap: RAIL_GAP,
  },

  // Search results
  result: {
    paddingHorizontal: RAIL_EDGE,
  },

  loading: {
    marginTop: SP.xxxl,
  },
  empty: {
    paddingTop: SP.xxxl,
  },
});
