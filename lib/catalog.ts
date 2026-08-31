import type { Database } from "./database.types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];

// ─── Artwork ───────────────────────────────────────────────
// Curated Pexels photography (free license), streamed + cached by RN.
// Every URL below was verified live before shipping. If offline, cards
// fall back to a flat panel color.

const pex = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const ARTWORK_BY_ID: Record<string, string> = {
  // Brand pass: macro photography — zoomed-in, detailed, tactile.
  "local-dawn-birds": pex(36404660), // feather with morning dew, macro
  "local-river": pex(14933322), // moss beside flowing water, close
  "local-ocean-waves": pex(8335650), // seafoam lace on sand, macro
  "local-rain": pex(28961050), // raindrops hanging on a leaf edge
  "local-crickets": pex(33155622), // dew on grass, night bokeh
  "local-theta": pex(5214569), // single water droplet, minimal
  "local-freq-alpha": pex(949587), // warm bokeh
  "local-freq-delta": pex(2115085), // leaf skeleton, backlit veins
  "local-horo-star": pex(1257860), // milky way
  "local-horo-cosmic": pex(355887), // night sky over trees
  "local-horo-moon": pex(1287145), // moon over snowy peaks
  "local-words-affirm": pex(736230), // rose petals, close
  "local-words-grace": pex(10064818), // white feather, soft macro
  "local-words-stoic": pex(35527794), // intricate leaf pattern, macro
};

const ARTWORK_BY_TITLE: Record<string, string> = {
  "deep sleep induction": pex(2115085), // backlit leaf skeleton
  "circadian reset": pex(36831777), // glowing green leaf veins
  "improve focus": pex(5214569), // one droplet, held
  "morning confidence ritual": pex(785695), // clear dew on fresh green
  "self-worth boost": pex(717412), // droplet on vibrant leaf
  "gratitude flood": pex(6527380), // dew strung across moss
  "panic relief": pex(10064818), // white feather, weightless
};

const ARTWORK_BY_CATEGORY: Record<string, string> = {
  Naturescapes: pex(6527380), // dew on moss
  Sleep: pex(2115085),
  Confidence: pex(785695),
  Addiction: pex(969044), // new moss growth
  Mindfulness: pex(5214569),
  Anxiety: pex(10064818),
  "Focus & Productivity": pex(5214569),
  "Health & Habits": pex(18012355), // vibrant living moss
  "Mental & Emotional": pex(34415000), // dew drops, ordered
  "Spiritual / Purpose-driven": pex(38445116), // intricate vein network
  Frequencies: pex(949587),
  Horoscope: pex(355887),
  "Positive Words": pex(736230),
};

const ARTWORK_FALLBACK = pex(34415000);

// Scenic pool for the hypnotherapy library — every session gets its own
// photo, assigned by a stable hash of its title so it never shuffles.
// All macro: texture and detail, not postcards.
const HYPNO_POOL = [
  pex(785695), // dew on green
  pex(34415000), // dew rows on leaf
  pex(16086657), // single dew drop
  pex(717412), // droplet on leaf
  pex(6527380), // moss dew strands
  pex(969044), // moss forest floor
  pex(36148607), // fern leaf detail
  pex(10064818), // white feather
  pex(5840692), // ostrich feather softness
  pex(33155622), // grass dew bokeh
];

function stableIndex(text: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Artwork URL for a session card / player hero. */
export function artworkFor(session: Pick<Session, "id" | "title" | "category">): string {
  const direct =
    ARTWORK_BY_ID[session.id] ?? ARTWORK_BY_TITLE[session.title.toLowerCase()];
  if (direct) return direct;
  if (channelFor(session as any) === "Hypnotherapy") {
    return HYPNO_POOL[stableIndex(session.title, HYPNO_POOL.length)];
  }
  return ARTWORK_BY_CATEGORY[session.category] ?? ARTWORK_FALLBACK;
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
  local("local-dawn-birds", "First Light", "A real dawn breaking over a German lakeside, birds waking one by one", "ambient-dawn-birds", 150),
  local("local-river", "Meltwater", "A glacial river running through Icelandic highland, recorded in the field", "ambient-river", 150),
  local("local-ocean-waves", "Tideline", "Baltic Sea waves rolling onto the shore, recorded at the water\u2019s edge", "ambient-ocean-waves", 150),
  local("local-rain", "Roofsong", "Gentle rain on a quiet rooftop \u2014 a real storm, softly recorded", "ambient-rain", 150),
  local("local-crickets", "Nightfield", "Night in the Sian Ka\u2019an jungle reserve, Mexico \u2014 crickets and warm air", "ambient-crickets", 150),
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
