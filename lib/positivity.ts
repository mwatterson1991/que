/**
 * positivity.ts — the score behind the profile graph.
 *
 * Michael's model: the graph must breathe both ways. Doing the work
 * (gratitude entries, habit completions) earns points; a day with no
 * activity at all costs points. The line dips below the baseline when
 * you drift, climbs when you show up — like a stock ticker on yourself.
 *
 * Derived entirely from gratitude entries + habit logs, so it works
 * identically for guests (AsyncStorage) and account holders (Supabase).
 */

export const PTS_PER_GRATITUDE = 1; // each line written
export const PTS_PER_HABIT = 2;     // each habit completion logged
export const MISS_PENALTY = -3;     // a day you didn't show up at all

export interface DayActivity {
  date: string; // YYYY-MM-DD local
  gratitudeCount: number;
  habitCount: number;
}

export interface PositivitySeries {
  /** Cumulative score per day, oldest → newest */
  points: number[];
  /** Matching YYYY-MM-DD labels */
  dates: string[];
  /** Where the line ends today */
  total: number;
  /** Points earned today (never includes the miss penalty) */
  todayPts: number;
  /** Change over the last 7 days */
  weekDelta: number;
}

function localDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString("en-CA");
}

function countByDay(dates: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of dates) m.set(d, (m.get(d) ?? 0) + 1);
  return m;
}

/**
 * The daily walk: cumulative score, one step per day, oldest → newest.
 * Shared by the 30-day series and the ticker so both tell the same story.
 */
function walkDaily(
  gratByDay: Map<string, number>,
  habitByDay: Map<string, number>,
  days: number,
): { dates: string[]; points: number[] } {
  // The penalty only applies once you've started: quiet days before the
  // first-ever entry are neutral, so a brand-new user starts at 0, not
  // in a hole.
  const allDates = [...gratByDay.keys(), ...habitByDay.keys()].sort();
  const firstActive = allDates[0];

  const points: number[] = [];
  const dates: string[] = [];
  let running = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = localDate(i);
    const g = gratByDay.get(date) ?? 0;
    const h = habitByDay.get(date) ?? 0;
    const earned = g * PTS_PER_GRATITUDE + h * PTS_PER_HABIT;
    const started = firstActive !== undefined && date >= firstActive;
    const isToday = i === 0;
    if (earned > 0) {
      running += earned;
    } else if (started && !isToday) {
      // Today isn't over — no penalty until the day actually passes.
      running += MISS_PENALTY;
    }
    points.push(running);
    dates.push(date);
  }
  return { dates, points };
}

export function buildPositivitySeries(
  gratitudeDates: string[], // entry_date per saved gratitude line
  habitLogDates: string[],  // log_date per habit completion
  days = 31,
): PositivitySeries {
  const gratByDay = countByDay(gratitudeDates);
  const habitByDay = countByDay(habitLogDates);
  const { dates, points } = walkDaily(gratByDay, habitByDay, days);

  const today = localDate(0);
  const todayPts =
    (gratByDay.get(today) ?? 0) * PTS_PER_GRATITUDE +
    (habitByDay.get(today) ?? 0) * PTS_PER_HABIT;
  const total = points[points.length - 1] ?? 0;
  const weekDelta = total - (points[points.length - 8] ?? 0);

  return { points, dates, total, todayPts, weekDelta };
}

// ─── The self-ticker ─────────────────────────────────────
//
// Apple's Stocks app in one object: a current value, what it opened the
// window at, the signed change, and a set of points to draw between.
// Every value here comes out of real gratitude entries and habit logs —
// nothing is projected forward and nothing is invented between them.

export type TickerRange = "1D" | "1W" | "1M" | "3M" | "1Y";

export const TICKER_RANGES: TickerRange[] = ["1D", "1W", "1M", "3M", "1Y"];

/** How far back each range looks, in days. */
const RANGE_BACK: Record<TickerRange, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
};

/**
 * Long enough that the cumulative walk behind every range is the same
 * walk — a 1Y line and a 1W line agree on where you are today.
 */
export const TICKER_HISTORY_DAYS = 400;

/** Smallest opening value a percentage is allowed to be measured against. */
const PCT_MIN_BASE = 10;

export interface TickerPoint {
  /** 0 = left edge of the window, 1 = right edge (now, or midnight tonight on 1D) */
  x: number;
  /** the score at that moment */
  v: number;
}

export interface TickerSeries {
  range: TickerRange;
  /** Real points only — the renderer interpolates between these, never past them. */
  points: TickerPoint[];
  /** Where the window opened */
  open: number;
  /** Where it stands right now */
  current: number;
  change: number;
  /** null when the opening value is ~0, where a percentage would be meaningless */
  changePct: number | null;
  /** Did anything actually happen inside this window? */
  hasActivity: boolean;
  /** Points earned today so far (never includes the miss penalty) */
  todayPts: number;
  /** Axis captions, left → right */
  startLabel: string;
  midLabel: string;
  endLabel: string;
  /** Plain-English name for the window, e.g. "today", "past week" */
  periodLabel: string;
}

const PERIOD_LABEL: Record<TickerRange, string> = {
  "1D": "today",
  "1W": "past week",
  "1M": "past month",
  "3M": "past 3 months",
  "1Y": "past year",
};

/** Local hour-of-day (0–24, fractional) for an ISO timestamp. */
function hourOfDay(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() + d.getMinutes() / 60;
}

function shortDate(iso: string, withYear: boolean): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(
    "en-US",
    withYear ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" },
  );
}

export interface GratitudeRowLike {
  entry_date: string;
  created_at?: string | null;
}

export interface HabitLogRowLike {
  log_date: string;
  logged_at?: string | null;
}

/**
 * Today, at hourly resolution.
 *
 * Seven gratitude lines saved in the same two minutes would otherwise be
 * seven vertical jumps, so events are bucketed into the hour they landed
 * in and the line steps once per hour. The first point is yesterday's
 * close (the day's "open"); the last point sits at the current clock
 * time carrying the true running total, which is why the line stops
 * short of the right edge — the rest of the day hasn't happened yet.
 */
function buildIntraday(
  gratitude: GratitudeRowLike[],
  habitLogs: HabitLogRowLike[],
  open: number,
): { points: TickerPoint[]; earned: number } {
  const today = localDate(0);
  const buckets = new Array<number>(24).fill(0);

  const add = (hour: number | null, pts: number) => {
    // A row with no usable timestamp is credited to the top of the day
    // rather than invented into the recent past — it lifts the open,
    // it never draws a rise that didn't happen when it says it did.
    const h = hour === null ? 0 : Math.min(23, Math.max(0, Math.floor(hour)));
    buckets[h] += pts;
  };

  for (const g of gratitude) {
    if (g.entry_date !== today) continue;
    add(hourOfDay(g.created_at), PTS_PER_GRATITUDE);
  }
  for (const l of habitLogs) {
    if (l.log_date !== today) continue;
    add(hourOfDay(l.logged_at), PTS_PER_HABIT);
  }

  const now = new Date();
  const nowF = Math.min(24, now.getHours() + now.getMinutes() / 60);

  const points: TickerPoint[] = [{ x: 0, v: open }];
  let running = open;
  for (let h = 0; h <= Math.floor(nowF) && h < 24; h++) {
    running += buckets[h];
    const x = Math.min(h + 1, nowF) / 24;
    const last = points[points.length - 1];
    if (x <= last.x) last.v = running; // same instant — keep the later value
    else points.push({ x, v: running });
  }
  // Make sure the line actually reaches "now" even on a quiet day.
  const tail = points[points.length - 1];
  if (tail.x < nowF / 24) points.push({ x: nowF / 24, v: running });

  return { points, earned: running - open };
}

/**
 * Build the ticker for one range out of the raw rows.
 *
 * 1D is intraday (hourly); everything longer is the daily walk sliced to
 * the window, including the day before it so the line has a real opening
 * value to be measured against.
 */
export function buildTickerSeries(
  gratitude: GratitudeRowLike[],
  habitLogs: HabitLogRowLike[],
  range: TickerRange,
): TickerSeries {
  const gratByDay = countByDay(gratitude.map((g) => g.entry_date));
  const habitByDay = countByDay(habitLogs.map((l) => l.log_date));
  const walk = walkDaily(gratByDay, habitByDay, TICKER_HISTORY_DAYS);

  const today = localDate(0);
  const todayPts =
    (gratByDay.get(today) ?? 0) * PTS_PER_GRATITUDE +
    (habitByDay.get(today) ?? 0) * PTS_PER_HABIT;

  let points: TickerPoint[];
  let open: number;
  let startLabel: string;
  let midLabel: string;
  let hasActivity: boolean;

  if (range === "1D") {
    open = walk.points[walk.points.length - 2] ?? 0; // yesterday's close
    const intraday = buildIntraday(gratitude, habitLogs, open);
    points = intraday.points;
    hasActivity = intraday.earned !== 0;
    startLabel = "12 AM";
    midLabel = "12 PM";
  } else {
    const back = RANGE_BACK[range];
    const slice = walk.points.slice(-(back + 1));
    const sliceDates = walk.dates.slice(-(back + 1));
    open = slice[0] ?? 0;
    points = slice.map((v, i) => ({ x: i / Math.max(slice.length - 1, 1), v }));
    hasActivity = sliceDates.some(
      (d, i) => i > 0 && ((gratByDay.get(d) ?? 0) > 0 || (habitByDay.get(d) ?? 0) > 0),
    );
    const longRange = range === "1Y";
    startLabel = shortDate(sliceDates[0] ?? today, longRange);
    midLabel = shortDate(sliceDates[Math.floor(sliceDates.length / 2)] ?? today, longRange);
  }

  const current = points[points.length - 1]?.v ?? 0;
  const change = current - open;
  // A percentage off a near-zero opening value is noise, not information:
  // three points on a base of one is "+300%", which tells you nothing and
  // reads as a made-up number. Below a base of 10 the card shows the
  // signed change on its own.
  const changePct = Math.abs(open) >= PCT_MIN_BASE ? (change / Math.abs(open)) * 100 : null;

  return {
    range,
    points,
    open,
    current,
    change,
    changePct,
    hasActivity,
    todayPts,
    startLabel,
    midLabel,
    endLabel: "Now",
    periodLabel: PERIOD_LABEL[range],
  };
}
