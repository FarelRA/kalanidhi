/**
 * The seed's single clock.
 *
 * Every seed mutation and action receives one `now` from the runner and builds
 * one `SeedClock` from it. Nothing under `convex/seed*` reads `Date.now()`
 * directly, so two runs with the same `now` produce identical timestamps.
 *
 * The seed timeline compresses the real elapsed time since the platform opened
 * into a fixed window: legacy fixtures used relative offsets up to 400 days,
 * and those are rescaled so the oldest event lands in the opening week of 2026
 * while the ordering between events is preserved.
 */
export const DAY = 86_400_000
export const HOUR = 3_600_000

/** The platform opened on 2 January 2026 (08:00 Jakarta). */
export const SEED_START = Date.UTC(2026, 0, 2, 8, 0, 0)

/** The first learner joins on 3 January 2026 (08:00 Jakarta). */
export const FIRST_PARTICIPANT_AT = Date.UTC(2026, 0, 3, 8, 0, 0)

/** Jakarta is UTC+7 all year; the seed never needs a tz database. */
const JAKARTA_OFFSET = 7 * HOUR

/** Legacy seed fixtures used relative offsets up to 400 days. */
const LEGACY_SPAN_DAYS = 400

/** Jakarta midnight for a timestamp, used to bucket daily metrics. */
export function jakartaDayStart(timestamp: number): number {
  return Math.floor((timestamp + JAKARTA_OFFSET) / DAY) * DAY - JAKARTA_OFFSET
}

/** Calendar date (`YYYY-MM-DD`) of a timestamp in Jakarta. */
export function jakartaDate(timestamp: number): string {
  const shifted = new Date(timestamp + JAKARTA_OFFSET)
  return shifted.toISOString().slice(0, 10)
}

export type SeedClock = {
  /** The instant this run is anchored to. */
  now: number
  /** The platform's opening instant. */
  start: number
  day: number
  hour: number
  /**
   * A timestamp between the opening day and `now`, preserving relative order.
   * Non-positive offsets stay literal (they are "just before now").
   */
  ago(days: number): number
  /** A future timestamp for scheduled sessions, deadlines, and payouts. */
  ahead(days: number): number
  /**
   * A timestamp `dayOffset` days from today (negative is the past) at the given
   * Jakarta wall-clock hour.
   */
  at(dayOffset: number, hour: number): number
  /** Jakarta midnight for a timestamp. */
  dayStart(timestamp: number): number
  /** Calendar date (`YYYY-MM-DD`) of a timestamp in Jakarta. */
  date(timestamp: number): string
}

export function createSeedClock(now: number): SeedClock {
  const spanDays = Math.max(1, (now - SEED_START) / DAY)

  const ago = (days: number): number => {
    if (days <= 0) return now - Math.round(days * DAY)
    const scaled = (days / LEGACY_SPAN_DAYS) * spanDays
    return Math.max(SEED_START, Math.round(now - scaled * DAY))
  }

  return {
    now,
    start: SEED_START,
    day: DAY,
    hour: HOUR,
    ago,
    ahead: (days: number) => now + Math.round(days * DAY),
    at: (dayOffset: number, hour: number) =>
      jakartaDayStart(now + Math.round(dayOffset * DAY)) + hour * HOUR,
    dayStart: jakartaDayStart,
    date: jakartaDate,
  }
}
