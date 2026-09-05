import type { Database } from "./database.types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];

// ─── Artwork ───────────────────────────────────────────────
// Curated Pexels photography (free license), streamed + cached by RN.
// Every ID below was verified live (HTTP 200) before shipping. If
// offline, cards fall back to a flat panel colour.
//
// ONE visual family for the whole catalog: dusk and fog, low natural
// light, cool tones with the occasional warm glow, nobody's face in
// focus. The cards then add one shared treatment (see Artwork in
// SessionCard.tsx) so twenty different photographs read as one set.

const pex = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const ARTWORK_BY_ID: Record<string, string> = {
  // Naturescapes carry a picture of their PLACE, so sound and picture
  // are one idea.
  "local-crickets": pex(18275759), // Milky Way over tropical foliage, night
  "local-river": pex(27612186), // grey glacial river over dark rock, Iceland
  "local-ocean-waves": pex(4994267), // long-exposure dusk shore, Rostock
  "local-rain": pex(722149), // raindrops on glass at twilight
  "local-dawn-birds": pex(5392095), // tree line over a still lake at dawn

  // Frequencies: calm abstract light, not a waveform.
  "local-freq-alpha": pex(5466506), // sunlight through the surface of the sea
  "local-theta": pex(15210605), // beams falling into deep water
  "local-freq-delta": pex(9336097), // long-exposure dusk water, near still

  // Positive Words: a candle, a page in low light, a window.
  "local-words-kings": pex(8858805), // a lit candle beside an open book
  "local-words-prodigal": pex(11539621), // an open book and a candle, dark

  // Stoicism: marble in low light.
  "local-words-stoic": pex(28426413), // open book in dim light on dark wood
  "local-stoic-med-2": pex(24907794), // a bust of Marcus Aurelius, side lit
  "local-stoic-med-5": pex(16272966), // a marble bust, close, in shadow
  "local-stoic-enchiridion": pex(36089246), // Roman statues in a dim hall
  "local-words-grace": pex(23110026), // morning light through a sheer curtain
  "local-words-affirm": pex(2889618), // warm morning light across a dark room

  // Horoscope
  "local-horo-star": pex(12863822), // the moon through cloud
  "local-horo-cosmic": pex(12863822),
  "local-horo-moon": pex(12863822),
};

// Hypnotherapy sessions live in the database, so they are matched by
// title. Each of the four featured sessions gets a paired image.
const ARTWORK_BY_TITLE: Record<string, string> = {
  "calm & centered start": pex(13697290), // fog lifting off a still lake
  "general morning mindset": pex(1287083), // low sun through mist
  "high performer daily activation": pex(15764165), // a lone figure on a foggy ridge
  "quit vaping / nicotine": pex(18567789), // someone breathing in a foggy mountain dusk
  "reduce anxiety": pex(36852508), // a hooded figure over a still, foggy lake
  "improve sleep quality": pex(8481534), // dark crumpled sheets, asleep
  "deep focus & flow state": pex(5960841), // a lone runner on a foggy path
  "morning prayer (lord's prayer)": pex(35450923), // one candle on dark cloth
  "quit smoking": pex(30454801), // a figure walking into misty hills
  "reduce social anxiety": pex(8883795), // one person in a foggy field
};

// Channel cards: the cover of each shelf.
const ARTWORK_BY_CATEGORY: Record<string, string> = {
  Naturescapes: pex(18386434), // a band of mist over a lake
  "Positive Words": pex(33473773), // two candles on dark sand
  Stoicism: pex(19085077), // a marble figure in a spotlight, dark room
  Frequencies: pex(187637), // dark seascape through silhouetted leaves
  Hypnotherapy: pex(13491656), // dark foggy forest
  Horoscope: pex(12863822), // the moon
};

const ARTWORK_FALLBACK = pex(13697290); // pines in fog

// The rest of the hypnotherapy library shares a small pool, assigned by
// a stable hash of the title so a session never changes its picture.
const HYPNO_POOL = [pex(13697290), pex(1287083), pex(15764165), pex(15328418)];

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

/** Cover artwork for a channel card (also the paywall hero for a channel). */
export function channelArtwork(channel: string): string {
  return ARTWORK_BY_CATEGORY[channel] ?? ARTWORK_FALLBACK;
}

// ─── Local sessions ────────────────────────────────────────
// Bundled recordings exposed as catalog entries alongside the Supabase
// sessions (they live in the app, not the database — see
// ATTRIBUTIONS.md for sources).
//
// Names are plain and true: the place, or the text. Every description
// says what you will actually hear. `tier: "premium"` marks the
// recordings that belong to the channel rather than the free three.

const local = (
  id: string,
  title: string,
  description: string,
  audio_asset: string,
  duration_sec: number,
  category = "Naturescapes",
  narrator = "Field recording",
  tier: "free" | "premium" = "free",
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
  tier,
  created_at: "2026-08-22T00:00:00Z",
});

// A public-domain reading streamed from the Internet Archive. LibriVox
// recordings are real people reading in their own voices, released into
// the public domain; the 64 kbps files are used so a wake-up does not
// wait on a large download. Bytes and seconds come from the archive's
// own metadata for each file.
const stream = (
  id: string,
  title: string,
  description: string,
  url: string,
  duration_sec: number,
  category: string,
  narrator: string,
  tier: "free" | "premium" = "free",
): Session => ({
  ...local(id, title, description, "", duration_sec, category, narrator, tier),
  audio_url: url,
  audio_asset: null,
});

const IA = (item: string, file: string) => `https://archive.org/download/${item}/${file}`;

export const LOCAL_SESSIONS: Session[] = [
  // Naturescapes — five real field recordings. Three are free; the
  // other two are part of the channel.
  local("local-crickets", "Jungle Night, Mexico", "Crickets and warm night air in the Sian Ka’an reserve", "ambient-crickets", 150),
  local("local-river", "Glacier River, Iceland", "Meltwater running over stones below the ice cap", "ambient-river", 150),
  local("local-ocean-waves", "Baltic Shore", "Waves arriving on shingle, recorded at the waterline", "ambient-ocean-waves", 150),
  local("local-rain", "Rain on the Roof", "Steady rain on a quiet rooftop, a real storm softly recorded", "ambient-rain", 150, "Naturescapes", "Field recording", "premium"),
  local("local-dawn-birds", "Lakeside Dawn, Germany", "Birds waking one by one over a still lake", "ambient-dawn-birds", 150, "Naturescapes", "Field recording", "premium"),

  // Frequencies
  local("local-freq-alpha", "Alpha · 10 Hz", "Awake but unhurried. Come up gently and start thinking clearly.", "freq-alpha", 120, "Frequencies", "Binaural tone"),
  local("local-theta", "Theta · 6 Hz", "The drowsy edge of sleep. Drift back down, or meditate deeply.", "theta-binaural", 120, "Frequencies", "Binaural tone"),
  local("local-freq-delta", "Delta · 2 Hz", "The slowest rhythm the brain keeps. Wind all the way down.", "freq-delta", 120, "Frequencies", "Binaural tone"),

  // Positive Words — the Lord's Prayer is a database session (see
  // FEATURED); these two are bundled. Affirmations are in the channel.
  local("local-words-stoic", "Marcus Aurelius & Seneca", "Meditations and On the Shortness of Life, read at dawn", "words-stoic", 41, "Stoicism", "Lily"),
  local("local-words-grace", "Scripture for the Morning", "Psalms and Paul, read slowly for the day ahead", "words-grace", 37, "Positive Words", "Lily"),
  local("local-words-affirm", "Morning Affirmations", "Kind, powerful words to begin again", "words-affirm", 39, "Positive Words", "Lily", "premium"),
  stream("local-words-kings", "The Still Small Voice", "1 Kings 19. Elijah in the cave: not in the wind, not in the earthquake, not in the fire. King James Version.", IA("bible_kjv_11_1king_0909_librivox", "1kings_19_kjv_64kb.mp3"), 263, "Positive Words", "Joy Chan"),
  stream("local-words-prodigal", "The Prodigal Son", "Luke 15 and 16. The lost sheep, the lost coin, and the son who came home. King James Version.", IA("bible_kjv_nt_03_luke_0812_librivox", "luke_15-16_kjv_64kb.mp3"), 654, "Positive Words", "LibriVox reader", "premium"),

  // Stoicism. Marcus Aurelius in George Long's translation, read by
  // LibriVox volunteers. Book Two and Book Five both open with the
  // morning, which is why they lead the shelf.
  stream("local-stoic-med-2", "Meditations, Book Two", "Begin the morning by saying to thyself: I shall meet with the busybody, the ungrateful, arrogant, deceitful, envious, unsocial.", IA("meditations_0708_librivox", "meditations_02_marcusaurelius_64kb.mp3"), 830, "Stoicism", "Kevin McAsh"),
  stream("local-stoic-med-5", "Meditations, Book Five", "In the morning when thou risest unwillingly, let this thought be present: I am rising to the work of a human being.", IA("meditations_0708_librivox", "meditations_05_marcusaurelius_64kb.mp3"), 1957, "Stoicism", "Cicorée"),
  stream("local-stoic-enchiridion", "The Enchiridion", "Epictetus, complete. Some things are within our power, while others are not.", IA("enchiridion_librivox", "enchiridion-01-epictetus_64kb.mp3"), 3086, "Stoicism", "D. E. Wittkower", "premium"),

  // Horoscope — channel only. These stay in the catalog so existing
  // alarms and search still resolve, but the shelf shows one card.
  local("local-horo-star", "Morning Star Reading", "A hopeful read on the day the sky is offering you", "horo-star", 38, "Horoscope", "Lily", "premium"),
  local("local-horo-cosmic", "Cosmic Check-In", "A steady, unhurried alignment for the day ahead", "horo-cosmic", 35, "Horoscope", "Lily", "premium"),
  local("local-horo-moon", "Moon & Momentum", "What you start this morning gathers force today", "horo-moon", 32, "Horoscope", "Lily", "premium"),
];

// ─── Presentation overrides ────────────────────────────────
// A database session can be shown under a plainer name without
// touching the database. Keyed by lowercase database title.

const TITLE_OVERRIDES: Record<string, string> = {
  "morning prayer (lord's prayer)": "The Lord’s Prayer",
};

const DESCRIPTION_OVERRIDES: Record<string, string> = {
  "morning prayer (lord's prayer)":
    "A quiet guided morning prayer that ends in the Lord’s Prayer, read by Brian",
};

/** The name a session is shown under. */
export function displayTitle(session: Pick<Session, "title">): string {
  return TITLE_OVERRIDES[session.title.toLowerCase()] ?? session.title;
}

/** The one-line description a session is shown with. */
export function displayDescription(session: Pick<Session, "title" | "description">): string {
  return DESCRIPTION_OVERRIDES[session.title.toLowerCase()] ?? session.description;
}

/** True when there is something to play. A session without audio is
 * shown as coming soon and never opened. */
export function hasAudio(session: Pick<Session, "audio_url" | "audio_asset">): boolean {
  return !!(session.audio_url || session.audio_asset);
}

// ─── Channels ──────────────────────────────────────────────
// The browse screen shows one rail per CHANNEL: its featured sessions
// first, then the channel card as the upsell at the end. The
// hypnotherapy library's database categories (Sleep, Confidence, …)
// all collapse into a single Hypnotherapy rail; the per-session
// category still shows on the player.

const HYPNOTHERAPY_CATEGORIES = new Set([
  "Sleep", "Confidence", "Anxiety", "Mindfulness", "Addiction", "General",
  "Focus & Productivity", "Health & Habits", "Mental & Emotional",
  "Spiritual / Purpose-driven",
]);

export const CHANNEL_ORDER = [
  "Naturescapes",
  "Positive Words",
  "Stoicism",
  "Frequencies",
  "Hypnotherapy",
  "Horoscope",
];

// Database sessions that belong to a different channel than their
// category says. Keyed by lowercase title.
const CHANNEL_BY_TITLE: Record<string, string> = {
  "morning prayer (lord's prayer)": "Positive Words",
};

/** Which channel rail a session belongs to. */
export function channelFor(session: Pick<Session, "id" | "category"> & { title?: string }): string {
  if (session.id === "local-theta") return "Frequencies";
  const byTitle = session.title ? CHANNEL_BY_TITLE[session.title.toLowerCase()] : undefined;
  if (byTitle) return byTitle;
  if (HYPNOTHERAPY_CATEGORIES.has(session.category)) return "Hypnotherapy";
  return session.category;
}

// What each shelf shows, in order. Local sessions by id, database
// sessions by lowercase title. Anything not listed stays in the
// catalog (search, alarms, deep links) but is sold through the channel
// card rather than shown on the shelf.
const FEATURED: Record<string, string[]> = {
  Naturescapes: ["local-ocean-waves", "local-crickets", "local-river"],
  "Positive Words": ["morning prayer (lord's prayer)", "local-words-kings", "local-words-grace"],
  // The synthetic voice reading (local-words-stoic) stays in the catalog
  // for alarms that already use it, but the shelf leads with real readers.
  Stoicism: ["local-stoic-med-2", "local-stoic-med-5"],
  // Theta stays in the catalog for existing alarms but is off the shelf:
  // its card was indistinguishable from Alpha's.
  Frequencies: ["local-freq-alpha", "local-freq-delta"],
  // Pruned to four clearly different sessions.
  Hypnotherapy: [
    "quit vaping / nicotine",
    "reduce anxiety",
    "improve sleep quality",
    "deep focus & flow state",
  ],
  Horoscope: [],
};

// The database category is the key; this is the name on the shelf.
// Renaming here costs nothing; renaming the category means migrating rows.
const DISPLAY_NAMES: Record<string, string> = {
  Horoscope: "Astrology",
};

/** What a station is called on screen. */
export function displayName(channel: string): string {
  return DISPLAY_NAMES[channel] ?? channel;
}

export type Rail = {
  channel: string;
  /** The free sessions shown on the shelf, in order. */
  featured: Session[];
  /** Everything the channel holds, featured included. */
  all: Session[];
};

/** Group sessions into ordered channel rails. Channels in CHANNEL_ORDER
 * always appear, even when they have nothing featured. */
export function groupIntoRails(sessions: Session[]): Rail[] {
  const byChannel = new Map<string, Session[]>();
  for (const ch of CHANNEL_ORDER) byChannel.set(ch, []);
  for (const s of sessions) {
    const ch = channelFor(s);
    const list = byChannel.get(ch) ?? [];
    list.push(s);
    byChannel.set(ch, list);
  }
  return [...byChannel.entries()].map(([channel, all]) => {
    const keys = FEATURED[channel] ?? [];
    const featured = keys
      .map((key) => all.find((s) => s.id === key || s.title.toLowerCase() === key))
      .filter((s): s is Session => !!s);
    return { channel, featured, all };
  });
}

/** Hypnotherapy sessions keep the orb + mantras on the player. */
export function isHypnotherapy(session: Pick<Session, "id" | "category"> & { title?: string }): boolean {
  return channelFor(session) === "Hypnotherapy";
}

// ─── Bedtime ───────────────────────────────────────────────
// Some recordings are for going to sleep, not for waking up. They wear a
// moon on their card and in the player so nobody sets one as an alarm by
// mistake.
const BEDTIME_IDS = new Set(["local-crickets", "local-freq-delta", "local-theta"]);
const BEDTIME_WORDS = ["sleep", "night", "wind down", "deep rest"];

export function isBedtime(session: Pick<Session, "id" | "title" | "category">): boolean {
  if (BEDTIME_IDS.has(session.id)) return true;
  const t = `${session.title} ${session.category}`.toLowerCase();
  return BEDTIME_WORDS.some((w) => t.includes(w));
}

// ─── Video ─────────────────────────────────────────────────
// Slow-motion loops that play behind the glass: one per station card and,
// where there is one, behind a session in the player. URLs point at
// Supabase storage (or any https host); an entry missing here means the
// screen falls back to the still artwork. Michael supplies the clips.
// A source is a URL string or a bundled require(); expo-video takes either.
export type VideoSource = string | number;

const OCEAN = require("../assets/video/ocean.mp4") as number;

const VIDEO_BY_CHANNEL: Record<string, VideoSource> = {
  Naturescapes: OCEAN,
};
const VIDEO_BY_SESSION: Record<string, VideoSource> = {
  "local-ocean-waves": OCEAN,
};

export function videoForChannel(channel: string): VideoSource | null {
  return VIDEO_BY_CHANNEL[channel] ?? null;
}

export function videoForSession(session: Pick<Session, "id">): VideoSource | null {
  return VIDEO_BY_SESSION[session.id] ?? null;
}
