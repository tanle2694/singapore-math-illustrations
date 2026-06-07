/**
 * Pure elapsed-time math for the "benchmark jump" Singapore Math strategy:
 * count forward from the start time in friendly hops — first to the next
 * full hour, then in whole hours, then the final few minutes — instead of
 * subtracting clock times directly.
 *
 * All times are represented as minutes-since-midnight (0–1439) so the
 * functions stay framework- and timezone-free and trivially testable.
 */

const MINUTES_PER_DAY = 1440;

const wrap = (minutes: number): number => ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

export interface ElapsedStep {
  fromMinutes: number;
  toMinutes: number;
  deltaMinutes: number;
}

export interface ElapsedBreakdown {
  steps: ElapsedStep[];
  totalMinutes: number;
}

/**
 * Breaks the journey from `startMinutes` to `endMinutes` into benchmark hops:
 * 1. (if not already on the hour) a short hop to the next full hour,
 * 2. one hop per whole hour after that,
 * 3. a final hop for the remaining minutes.
 *
 * Returns an empty breakdown when start and end coincide.
 */
export function computeElapsedSteps(startMinutes: number, endMinutes: number): ElapsedBreakdown {
  const start = wrap(startMinutes);
  let totalSpan = wrap(endMinutes - start);
  if (totalSpan === 0) return { steps: [], totalMinutes: 0 };

  const startHour = Math.floor(start / 60);
  const startMinuteOfHour = start % 60;
  const endTotal = wrap(start + totalSpan);
  const endHour = Math.floor(endTotal / 60);

  const benchmarks = [start];

  const nextFullHour = wrap((startHour + 1) * 60);
  const spanToNextFullHour = wrap(nextFullHour - start);
  const startsOffTheHour = startMinuteOfHour !== 0;
  if (startsOffTheHour && spanToNextFullHour < totalSpan) {
    benchmarks.push(nextFullHour);
  }

  const firstWholeHour = startsOffTheHour ? startHour + 1 : startHour;
  for (let hour = firstWholeHour; hour < endHour; hour++) {
    const benchmark = wrap((hour + 1) * 60);
    if (benchmarks[benchmarks.length - 1] !== benchmark) benchmarks.push(benchmark);
  }
  if (benchmarks[benchmarks.length - 1] !== endTotal) benchmarks.push(endTotal);

  const steps: ElapsedStep[] = benchmarks.slice(0, -1).map((from, i) => {
    const to = benchmarks[i + 1];
    const deltaMinutes = wrap(to - from) || MINUTES_PER_DAY;
    return { fromMinutes: from, toMinutes: to, deltaMinutes };
  });

  return { steps, totalMinutes: steps.reduce((sum, step) => sum + step.deltaMinutes, 0) };
}

/** Formats minutes-since-midnight as a friendly 12-hour clock string, e.g. "8:30 PM". */
export function formatClock12(totalMinutes: number): string {
  const minutes = wrap(totalMinutes);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour % 12 || 12;
  const meridiem = hour < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

export type DayPeriodId = 'night' | 'early-morning' | 'morning' | 'noon' | 'afternoon' | 'evening';

export interface DayPeriod {
  id: DayPeriodId;
  icon: string;
  label: string;
}

const DAY_PERIODS: ReadonlyArray<{ id: DayPeriodId; from: number; to: number; icon: string; label: string }> = [
  { id: 'early-morning', from: 300, to: 540, icon: '🌅', label: 'Sáng sớm' },
  { id: 'morning', from: 540, to: 720, icon: '☀️', label: 'Buổi sáng' },
  { id: 'noon', from: 720, to: 840, icon: '🌞', label: 'Buổi trưa' },
  { id: 'afternoon', from: 840, to: 1080, icon: '🌤️', label: 'Buổi chiều' },
  { id: 'evening', from: 1080, to: 1200, icon: '🌇', label: 'Buổi tối' },
];

const NIGHT: DayPeriod = { id: 'night', icon: '🌙', label: 'Ban đêm' };

/** Names the part of the day a given minute-of-day falls in (for the little mood badge under each clock). */
export function getDayPeriod(totalMinutes: number): DayPeriod {
  const minutes = wrap(totalMinutes);
  const match = DAY_PERIODS.find((period) => minutes >= period.from && minutes < period.to);
  return match ? { id: match.id, icon: match.icon, label: match.label } : NIGHT;
}

/** Splits minutes-since-midnight into an `{ hours, minutes }` pair for "Xh Ym" displays. */
export function splitHoursAndMinutes(totalMinutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}
