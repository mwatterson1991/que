import type { Database } from "./database.types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];

// ─── Artwork ───────────────────────────────────────────────
// Curated Pexels photography (free license), streamed + cached by RN.
// Every URL below was verified live before shipping. If offline, cards
// fall back to a flat panel color.

const pex = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const ARTWORK_BY_ID: Record<string, string> = {
  "local-dawn-birds": pex(302804), // pine forest
  "local-river": pex(355321), // mossy forest stream
  "local-ocean-waves": pex(1032650), // sunset beach waves
  "local-rain": pex(807598), // raindrops on leaves
  "local-crickets": pex(1257860), // milky way
  "local-theta": pex(62693), // clean light stripes
  "local-freq-alpha": pex(949587), // warm bokeh
  "local-freq-delta": pex(268533), // lone tree under stars
  "local-horo-star": pex(1257860), // milky way
  "local-horo-cosmic": pex(355887), // night sky over trees
  "local-horo-moon": pex(1287145), // moon over snowy peaks
  "local-words-affirm": pex(736230), // pink rose
  "local-words-grace": pex(268134), // meditation at sunset
  "local-words-stoic": pex(216798), // autumn path
};

const ARTWORK_BY_TITLE: Record<string, string> = {
  "deep sleep induction": pex(268533), // lone tree under stars
  "circadian reset": pex(355887), // night sky over trees
  "improve focus": pex(62693), // clean light stripes
  "morning confidence ritual": pex(417074), // alpine sunrise lake
  "self-worth boost": pex(371633), // bright mountain lake
  "gratitude flood": pex(268134), // meditation at sunset
  "panic relief": pex(1287145), // still snowy peaks + moon
};

const ARTWORK_BY_CATEGORY: Record<string, string> = {
  Naturescapes: pex(302804),
  Sleep: pex(268533),
  Confidence: pex(417074),
  Addiction: pex(216798), // autumn path — a new road
  Mindfulness: pex(268134),
  Anxiety: pex(462162), // calm ocean cove
  "Focus & Productivity": pex(62693), // clean light stripes
  "Health & Habits": pex(216798), // autumn path
  "Mental & Emotional": pex(462162), // calm ocean cove
  "Spiritual / Purpose-driven": pex(268134), // meditation at sunset
  Frequencies: pex(62693), // clean light stripes
  Horoscope: pex(355887), // night sky over trees
  "Positive Words": pex(736230), // pink rose
};

const ARTWORK_FALLBACK = pex(371633);

/** Artwork URL for a session card / player hero. */
export function artworkFor(session: Pick<Session, "id" | "title" | "category">): string {
  return (
    ARTWORK_BY_ID[session.id] ??
    ARTWORK_BY_TITLE[session.title.toLowerCase()] ??
    ARTWORK_BY_CATEGORY[session.category] ??
    ARTWORK_FALLBACK
  );
}

// ─── Local sessions ────────────────────────────────────────
// The five bundled nature soundscapes, exposed as playable catalog
// entries alongside the Supabase sessions (they live in the app, not
// the database — see ATTRIBUTIONS.md for sources).

const local = (
  id: string,
  title: string,
  description: string,
  audio_asset: string,
  duration_sec: number,
  category = "Naturescapes",
  narrator = "Field recording",
): Session => ({
  id,
  title,
  description,
  category,
  narrator,
  duration_sec,
  audio_url: null,
  audio_asset,
  plays: 0,
  mantras: [],
  tier: "free",
  created_at: "2026-08-22T00:00:00Z",
});

export const LOCAL_SESSIONS: Session[] = [
  local("local-dawn-birds", "Dawn Chorus", "Early morning birdsong over a running brook", "ambient-dawn-birds", 150),
  local("local-river", "River", "A steady river flowing over stones", "ambient-river", 150),
  local("local-ocean-waves", "Ocean Waves", "Waves breaking on a rocky Chilean shore", "ambient-ocean-waves", 148),
  local("local-rain", "Rain on Leaves", "Soft rain falling through a forest canopy", "ambient-rain", 150),
  local("local-crickets", "Night Crickets", "Warm evening crickets under a clear sky", "ambient-crickets", 80),
  local("local-theta", "Theta 6 Hz", "Low binaural hum tuned to the theta brain state", "theta-binaural", 120, "Frequencies", "Binaural tone"),
  local("local-freq-alpha", "Alpha 10 Hz", "Bright binaural pulse for relaxed, wakeful focus", "freq-alpha", 120, "Frequencies", "Binaural tone"),
  local("local-freq-delta", "Delta 2 Hz", "Slow binaural pulse that mirrors deep sleep", "freq-delta", 120, "Frequencies", "Binaural tone"),
  local("local-horo-star", "Morning Star Reading", "A hopeful read on the day the sky is offering you", "horo-star", 38, "Horoscope", "Lily"),
  local("local-horo-cosmic", "Cosmic Check-In", "A steady, unhurried alignment for the day ahead", "horo-cosmic", 35, "Horoscope", "Lily"),
  local("local-horo-moon", "Moon & Momentum", "What you start this morning gathers force today", "horo-moon", 32, "Horoscope", "Lily"),
  local("local-words-affirm", "Morning Affirmations", "Kind, powerful words to begin again", "words-affirm", 39, "Positive Words", "Lily"),
  local("local-words-grace", "Grace for the Morning", "Scripture-inspired comfort for the day ahead", "words-grace", 37, "Positive Words", "Lily"),
  local("local-words-stoic", "Stoic Sunrise", "Marcus Aurelius and Seneca on getting out of bed", "words-stoic", 41, "Positive Words", "Lily"),
];

// ─── Channels ──────────────────────────────────────────────
// The browse screen shows one rail per CHANNEL. The hypnotherapy
// library's database categories (Sleep, Confidence, …) all collapse
// into a single Hypnotherapy rail; the per-session category still
// shows on the player. Channels with no content yet render a
// coming-soon card so the shelf is visible.

const HYPNOTHERAPY_CATEGORIES = new Set([
  "Sleep", "Confidence", "Anxiety", "Mindfulness", "Addiction", "General",
  "Focus & Productivity", "Health & Habits", "Mental & Emotional",
  "Spiritual / Purpose-driven",
]);

export const CHANNEL_ORDER = [
  "Naturescapes",
  "Hypnotherapy",
  "Frequencies",
  "Horoscope",
  "Positive Words",
];

/** Which channel rail a session belongs to. */
export function channelFor(session: Pick<Session, "id" | "category">): string {
  if (session.id === "local-theta") return "Frequencies";
  if (HYPNOTHERAPY_CATEGORIES.has(session.category)) return "Hypnotherapy";
  return session.category;
}

/** Group sessions into ordered channel rails: [channel, sessions[]].
 * Channels in CHANNEL_ORDER always appear, even when empty. */
export function groupIntoRails(sessions: Session[]): Array<[string, Session[]]> {
  const byChannel = new Map<string, Session[]>();
  for (const ch of CHANNEL_ORDER) byChannel.set(ch, []);
  for (const s of sessions) {
    const ch = channelFor(s);
    const list = byChannel.get(ch) ?? [];
    list.push(s);
    byChannel.set(ch, list);
  }
  return [...byChannel.entries()];
}

/** Placeholder artwork for an empty channel's coming-soon card. */
export function channelArtwork(channel: string): string {
  return ARTWORK_BY_CATEGORY[channel] ?? ARTWORK_FALLBACK;
}

/** Hypnotherapy sessions keep the orb player; everything else shows artwork. */
export function isHypnotherapy(session: Pick<Session, "id" | "category">): boolean {
  return channelFor(session) === "Hypnotherapy";
}
