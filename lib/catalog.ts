import type { Database } from "./database.types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];

// ─── Artwork ───────────────────────────────────────────────
// Curated Pexels photography (free license), streamed + cached by RN.
// Every URL below was verified live before shipping. If offline, cards
// fall back to a flat panel color.

const pex = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=640`;

const ARTWORK_BY_ID: Record<string, string> = {
  "local-dawn-birds": pex(302804), // pine forest
  "local-river": pex(355321), // mossy forest stream
  "local-ocean-waves": pex(1032650), // sunset beach waves
  "local-rain": pex(807598), // raindrops on leaves
  "local-crickets": pex(1257860), // milky way
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
): Session => ({
  id,
  title,
  description,
  category: "Naturescapes",
  narrator: "Field recording",
  duration_sec,
  audio_url: null,
  audio_asset,
  plays: 0,
  mantras: [],
  created_at: "2026-08-22T00:00:00Z",
});

export const LOCAL_SESSIONS: Session[] = [
  local("local-dawn-birds", "Dawn Chorus", "Early morning birdsong over a running brook", "ambient-dawn-birds", 150),
  local("local-river", "River", "A steady river flowing over stones", "ambient-river", 150),
  local("local-ocean-waves", "Ocean Waves", "Waves breaking on a rocky Chilean shore", "ambient-ocean-waves", 148),
  local("local-rain", "Rain on Leaves", "Soft rain falling through a forest canopy", "ambient-rain", 150),
  local("local-crickets", "Night Crickets", "Warm evening crickets under a clear sky", "ambient-crickets", 80),
];

// ─── Category rails ────────────────────────────────────────
// Display order for the browse screen. Naturescapes first, then the
// hypnotherapy library grouped by its categories.
export const CATEGORY_ORDER = [
  "Naturescapes",
  "Sleep",
  "Confidence",
  "Anxiety",
  "Mindfulness",
  "Addiction",
];

/** Group sessions into ordered rails: [category, sessions[]]. */
export function groupIntoRails(sessions: Session[]): Array<[string, Session[]]> {
  const byCat = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = byCat.get(s.category) ?? [];
    list.push(s);
    byCat.set(s.category, list);
  }
  const ordered: Array<[string, Session[]]> = [];
  for (const cat of CATEGORY_ORDER) {
    const list = byCat.get(cat);
    if (list?.length) {
      ordered.push([cat, list]);
      byCat.delete(cat);
    }
  }
  // Any categories not in the preset order go last, alphabetically
  for (const cat of [...byCat.keys()].sort()) {
    ordered.push([cat, byCat.get(cat)!]);
  }
  return ordered;
}
