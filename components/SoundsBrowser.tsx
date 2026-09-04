import { useMemo, useState, useCallback, ReactNode } from "react";
import { useRouter } from "expo-router";
import { View, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Txt, Empty, SearchField } from "@/components/ui";
import { C, SP } from "@/lib/tokens";
import { useSessions } from "@/lib/useSupabase";
import { groupIntoRails, displayTitle, displayDescription, hasAudio, type Rail as RailData } from "@/lib/catalog";
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
// editor's picker (tap → select, nothing plays). Same rails, same tiles.
//
// Every rail lists its featured SOUND cards first and ends with the
// CHANNEL card — the upsell sits at the end of the shelf, after you
// have heard what is free. A channel card never plays anything; it
// opens the paywall for that channel.
//
// One vertical FlatList carries both modes — shelves while browsing, a
// column of wide tiles while searching — with the search field as its
// header, so the field never remounts (and never drops the keyboard)
// when the first character is typed.

type RailItem =
  | { kind: "channel"; channel: string; count: number }
  | { kind: "session"; session: Session };

type ListItem =
  | { kind: "rail"; rail: RailData }
  | { kind: "result"; session: Session };

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
      <Txt kind="title2" style={styles.railLabel} maxFontSizeMultiplier={1.3}>
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
  bottomInset = SP.xxxl,
}: {
  onPressSession: (session: Session) => void;
  /** When given, the browser is a picker: the matching card wears a tick. */
  selectedId?: string;
  footer?: ReactNode;
  /** Room to leave under the list (the floating tab bar, or a picker's action bar). */
  bottomInset?: number;
}) {
  const { sessions, loading } = useSessions();
  const { unlocked } = usePremium();
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Locked sessions route to the paywall instead of playing/selecting.
  // A session with no audio yet is shown but never opened. Stable
  // identity so a card only re-renders when its own data moves.
  const handlePress = useCallback(
    (session: Session) => {
      if (!hasAudio(session)) return;
      if (isLocked(session, unlocked)) {
        router.push(`/paywall?id=${session.id}` as any);
      } else {
        onPressSession(session);
      }
    },
    [unlocked, router, onPressSession],
  );

  // The channel card is the upsell: it opens the paywall for that
  // channel and never picks a session on your behalf.
  const openChannel = useCallback(
    (channel: string) => {
      router.push(`/paywall?channel=${encodeURIComponent(channel)}` as any);
    },
    [router],
  );

  const rails = useMemo(() => groupIntoRails(sessions), [sessions]);

  const searchResults = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return sessions.filter(
      (s) =>
        displayTitle(s).toLowerCase().includes(q) ||
        displayDescription(s).toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  const items = useMemo<ListItem[]>(
    () =>
      query
        ? searchResults.map((session) => ({ kind: "result" as const, session }))
        : rails.map((rail) => ({ kind: "rail" as const, rail })),
    [query, searchResults, rails],
  );

  const renderRailItem = (item: RailItem) =>
    item.kind === "channel" ? (
      <ChannelCard channel={item.channel} count={item.count} onPress={openChannel} />
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
        channel={item.rail.channel}
        items={[
          ...item.rail.featured.map((session) => ({ kind: "session" as const, session })),
          { kind: "channel", channel: item.rail.channel, count: item.rail.all.length },
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
      keyExtractor={(item) => (item.kind === "rail" ? `rail:${item.rail.channel}` : item.session.id)}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: bottomInset }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <SearchField
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
          placeholder="Search sounds, topics, goals"
          accessibilityLabel="Search sounds"
          style={styles.search}
        />
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
  search: {
    marginHorizontal: SP.screen,
    marginTop: SP.sm,
    marginBottom: SP.xl,
  },

  // Rails
  rail: {
    marginBottom: SP.xl,
  },
  railLabel: {
    paddingHorizontal: SP.screen,
    marginBottom: SP.md,
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
