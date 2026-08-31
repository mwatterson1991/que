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
  // Naturescapes carry the image of their PLACE, so sound and picture
  // are one idea rather than two.
  "local-river": pex(28129919), // glacier ice — Vatnajökull
  "local-ocean-waves": pex(31216830), // Baltic shore
  "local-crickets": pex(9411736), // wet tropical leaves at night — Sian Ka'an
  "local-dawn-birds": pex(36404660), // feather with morning dew, macro
  "local-rain": pex(28961050), // raindrops hanging on a leaf edge
  "local-theta": pex(5214569), // single water droplet, minimal
  "local-freq-alpha": pex(949587), // warm bokeh
  "local-freq-delta": pex(2115085), // leaf skeleton, backlit veins
  "local-horo-star": pex(12863822), // the moon through cloud
  "local-horo-cosmic": pex(12863822), // the moon through cloud
  "local-horo-moon": pex(12863822), // the moon through cloud
  "local-words-affirm": pex(261719), // a pen on paper
  "local-words-grace": pex(261719), // a pen on paper
  "local-words-stoic": pex(261719), // a pen on paper
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
  Horoscope: pex(12863822), // the moon
  "Positive Words": pex(261719), // a pen on paper
};

const ARTWORK_FALLBACK = pex(34415000);

// Scenic pool for the hypnotherapy library — every session gets its own
// photo, assigned by a stable hash of its title so it never shuffles.
// All macro: texture and detail, not postcards.
// Hypnotherapy is a room, not a landscape: someone lying down with a
// practitioner beside them, blurred and faceless so it reads as the
// idea rather than as a stock portrait.
const HYPNO_POOL = [
  pex(5699437), // blurred session, unrecognisable
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
  local("local-river", "Vatnaj\u00f6kull", "Glacial meltwater running off Europe\u2019s largest ice cap, Iceland", "ambient-river", 150),
  local("local-ocean-waves", "The Baltic", "Waves arriving on a northern European shore, recorded at the waterline", "ambient-ocean-waves", 150),
  local("local-rain", "Roofsong", "Gentle rain on a quiet rooftop \u2014 a real storm, softly recorded", "ambient-rain", 150),
  local("local-crickets", "Sian Ka\u2019an", "Night in the Mexican biosphere reserve \u2014 crickets, warm air, no wind", "ambient-crickets", 150),
  local("local-theta", "Theta \u00b7 6 Hz", "The drowsy edge of sleep. Choose theta to drift back down, or to meditate deeply.", "theta-binaural", 120, "Frequencies", "Binaural tone"),
  local("local-freq-alpha", "Alpha \u00b7 10 Hz", "Awake but unhurried. Choose alpha to come up gently and start thinking clearly.", "freq-alpha", 120, "Frequencies", "Binaural tone"),
  local("local-freq-delta", "Delta \u00b7 2 Hz", "The slowest rhythm the brain keeps, the one of dreamless sleep. Choose delta to wind all the way down.", "freq-delta", 120, "Frequencies", "Binaural tone"),
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
  "Frequencies",
  "Horoscope",
  "Positive Words",
  "Hypnotherapy",
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
