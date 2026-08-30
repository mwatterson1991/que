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

export function buildPositivitySeries(
  gratitudeDates: string[], // entry_date per saved gratitude line
  habitLogDates: string[],  // log_date per habit completion
  days = 31,
): PositivitySeries {
  const gratByDay = new Map<string, number>();
  for (const d of gratitudeDates) gratByDay.set(d, (gratByDay.get(d) ?? 0) + 1);
  const habitByDay = new Map<string, number>();
  for (const d of habitLogDates) habitByDay.set(d, (habitByDay.get(d) ?? 0) + 1);

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

  const today = localDate(0);
  const todayPts =
    (gratByDay.get(today) ?? 0) * PTS_PER_GRATITUDE +
    (habitByDay.get(today) ?? 0) * PTS_PER_HABIT;
  const total = points[points.length - 1] ?? 0;
  const weekDelta = total - (points[points.length - 8] ?? 0);

  return { points, dates, total, todayPts, weekDelta };
}
