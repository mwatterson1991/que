import {
  useMemo,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  ReactNode,
} from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  Image,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { F, S } from "@/lib/fonts";
import { useSessions } from "@/lib/useSupabase";
import { groupIntoRails, artworkFor, channelArtwork } from "@/lib/catalog";
import { usePremium, isLocked } from "@/lib/premium";
import { Glass, TEXT_ON_IMAGE } from "@/components/Glass";
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
//
// The whole screen is backed by the artwork of whichever card is
// currently centred — see ArtworkBackdrop. Glass only sings over a real
// photograph, so the browse screen gives it one.

type RailItem =
  | { kind: "channel"; channel: string; sessions: Session[] }
  | { kind: "session"; session: Session };

/** Which photograph a rail item puts on the screen behind everything. */
function artOf(item: RailItem): string {
  return item.kind === "channel"
    ? channelArtwork(item.channel)
    : artworkFor(item.session);
}

// A channel is a promise, not a track: tapping one starts today's
// recording from it. Keyed to the calendar day so the pick is genuinely
// fresh each morning but never reshuffles under you mid-session.
function recordingOfTheDay(list: Session[]): Session | undefined {
  if (list.length === 0) return undefined;
  return list[Math.floor(Date.now() / 86_400_000) % list.length];
}

// ─── Full-screen artwork ───────────────────────────────────

const FADE_MS = 460;
/** How fast an interrupted fade is allowed to finish underneath. */
const SETTLE_MS = 140;
/** Enough to lose all subject detail and keep only colour and light. */
const BACKDROP_BLUR = 24;

type BackdropHandle = { show: (uri: string) => void };

/**
 * The focused card's photograph, blown up behind the entire screen,
 * blurred to a colour field and dropped to a fraction of its brightness
 * so the glass above it stays readable.
 *
 * Deliberately imperative. If the focused artwork lived in the
 * browser's state, every snap of a rail would re-render five rails
 * worth of cards mid-gesture. Instead the rails call `show()` on this
 * ref: only the two <Image> layers in here ever re-render, and the
 * crossfade itself is a reanimated shared value, so it runs on the UI
 * thread and never waits on JS.
 *
 * Two layers, swapped rather than cross-dissolved: the outgoing photo
 * holds at full opacity underneath while the incoming one fades in over
 * it, so the screen never dips towards black between two images. Each
 * layer keeps its host <Image> for the life of the screen — only the
 * `source` changes, and only when the focused card actually changes.
 */
const ArtworkBackdrop = forwardRef<BackdropHandle, { initial?: string }>(
  function ArtworkBackdrop({ initial }, ref) {
    const [slots, setSlots] = useState<[string | undefined, string | undefined]>([
      initial,
      undefined,
    ]);
    const [active, setActive] = useState<0 | 1>(0);

    const o0 = useSharedValue(0);
    const o1 = useSharedValue(0);
    const activeRef = useRef<0 | 1>(0);
    const currentRef = useRef<string | undefined>(initial);
    const slotsRef = useRef<[string | undefined, string | undefined]>([
      initial,
      undefined,
    ]);

    const fadeIn = useCallback(
      (slot: 0 | 1) => {
        const sv = slot === 0 ? o0 : o1;
        sv.value = withTiming(1, {
          duration: FADE_MS,
          easing: Easing.out(Easing.quad),
        });
      },
      [o0, o1],
    );

    useImperativeHandle(
      ref,
      () => ({
        show(uri: string) {
          if (!uri || uri === currentRef.current) return;
          currentRef.current = uri;

          const next: 0 | 1 = activeRef.current === 0 ? 1 : 0;
          activeRef.current = next;

          const incoming = next === 0 ? o0 : o1;
          const outgoing = next === 0 ? o1 : o0;
          cancelAnimation(incoming);
          cancelAnimation(outgoing);
          // Whatever was arriving becomes the floor this one lands on.
          // Rushed to full rather than snapped, because a fast swipe can
          // catch it half-faded and a snap would read as a flash.
          outgoing.value = withTiming(1, { duration: SETTLE_MS });
          // Safe to blank: this layer is currently underneath an opaque
          // one, so neither the reset nor the source swap is visible.
          incoming.value = 0;

          const reused = slotsRef.current[next] === uri;
          const nextSlots: [string | undefined, string | undefined] = [
            slotsRef.current[0],
            slotsRef.current[1],
          ];
          nextSlots[next] = uri;
          slotsRef.current = nextSlots;
          setSlots(nextSlots);
          setActive(next);

          // Same photo landing back in the same layer means the source
          // never changes, so onLoad never fires — start it by hand.
          if (reused) fadeIn(next);
        },
      }),
      [fadeIn, o0, o1],
    );

    // Fading only once the bitmap is decoded means we never dissolve
    // into an empty layer on a cold cache.
    const handleLoad = useCallback(
      (slot: 0 | 1, uri: string) => {
        if (activeRef.current === slot && slotsRef.current[slot] === uri) {
          fadeIn(slot);
        }
      },
      [fadeIn],
    );

    const style0 = useAnimatedStyle(() => ({ opacity: o0.value }));
    const style1 = useAnimatedStyle(() => ({ opacity: o1.value }));

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.backdropLayers}>
          {([0, 1] as const).map((slot) => {
            const uri = slots[slot];
            return (
              <Animated.View
                key={slot}
                style={[
                  StyleSheet.absoluteFill,
                  slot === 0 ? style0 : style1,
                  { zIndex: active === slot ? 2 : 1 },
                ]}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.backdropImage}
                    blurRadius={BACKDROP_BLUR}
                    resizeMode="cover"
                    onLoad={() => handleLoad(slot, uri)}
                  />
                ) : null}
              </Animated.View>
            );
          })}
        </View>
        <View style={styles.backdropScrim} />
      </View>
    );
  },
);

// ─── One channel shelf ─────────────────────────────────────

function Rail({
  channel,
  items,
  backdrop,
  renderItem,
}: {
  channel: string;
  items: RailItem[];
  backdrop: React.RefObject<BackdropHandle | null>;
  renderItem: (item: RailItem, index: number) => ReactNode;
}) {
  // Which card is centred. A ref, not state: the focus drives the
  // backdrop and nothing else on screen, so it must never re-render the
  // rail mid-swipe.
  const focused = useRef(0);

  const sync = useCallback(
    (x: number) => {
      const i = Math.max(
        0,
        Math.min(items.length - 1, Math.round(x / SNAP_INTERVAL)),
      );
      if (i === focused.current) return;
      focused.current = i;
      const item = items[i];
      if (item) backdrop.current?.show(artOf(item));
    },
    [items, backdrop],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => sync(e.nativeEvent.contentOffset.x),
    [sync],
  );

  return (
    <View style={styles.rail}>
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
        // Every card carries a live glass shimmer and a full-bleed
        // photograph, so keep the mounted window tight — about two cards
        // either side of the one you're looking at.
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onMomentumScrollEnd={onScroll}
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
  const backdrop = useRef<BackdropHandle | null>(null);

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

  // What the screen opens on: the first shelf's channel card, which is
  // the first thing centred. groupIntoRails always leads with the same
  // channel, so this is stable from the very first frame.
  const initialArt = useMemo(
    () => (rails.length > 0 ? channelArtwork(rails[0][0]) : undefined),
    [rails],
  );

  const renderRailItem = (item: RailItem, index: number) =>
    item.kind === "channel" ? (
      <ChannelCard
        channel={item.channel}
        sessions={item.sessions}
        index={index}
        onPress={() => {
          const pick = recordingOfTheDay(item.sessions);
          if (pick) handlePress(pick);
        }}
      />
    ) : (
      <SessionCard
        session={item.session}
        index={index}
        selected={selectedId !== undefined ? item.session.id === selectedId : undefined}
        locked={isLocked(item.session, unlocked)}
        onPress={handlePress}
      />
    );

  return (
    <View style={styles.container}>
      {withAurora && <AuroraBackground dim={0.8} />}
      {/* Sits ABOVE the aurora — the aurora paints an opaque base, and
          the artwork is meant to be the ground the glass reads against.
          A little of the preset's colour still bleeds through. */}
      <ArtworkBackdrop ref={backdrop} initial={initialArt} />

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
          // ── Search results: one full-width card per row ──
          <FlatList
            data={searchResults}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <SessionCard
                session={item}
                variant="wide"
                index={index}
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
                backdrop={backdrop}
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

  // Full-screen artwork
  backdropLayers: {
    ...StyleSheet.absoluteFill,
    // Not quite opaque, so the backdrop preset's colour still tints the
    // photograph and the app keeps its own light.
    opacity: 0.9,
    overflow: "hidden",
  },
  // Overscaled because a blur samples past the edges of its own image
  // and would leave a pale seam down the sides of the screen.
  backdropImage: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 1.15 }],
  },
  // The photograph is scenery, not content. Everything above it — glass,
  // headings, captions — has to win.
  backdropScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.62)",
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
  // The H1 of this screen. Every card title sits below it on the scale,
  // and it now reads over photography, so it carries its own lift.
  railTitle: {
    color: "#f5f5f7",
    fontSize: S.heading,
    fontFamily: F.bold,
    letterSpacing: -0.4,
    paddingHorizontal: RAIL_EDGE,
    marginBottom: 12,
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
