import { addDays, atTime, dayOfWeek, weekStart } from './dates';
import type { Activity, CheckIn, ISODate } from './types';

/** Check-ins for one activity, keyed by date. */
export type CheckInMap = ReadonlyMap<ISODate, CheckIn>;

export type DayStatus = 'done' | 'partial' | 'missed' | 'pending' | 'notDue' | 'paused' | 'future' | 'before';

export function toCheckInMap(checkIns: CheckIn[]): Map<ISODate, CheckIn> {
  return new Map(checkIns.map((c) => [c.date, c]));
}

export function isPaused(a: Activity, date: ISODate): boolean {
  if (a.skippedDays?.includes(date)) return true;
  return a.pausedRanges.some((r) => r.from <= date && (r.to === undefined || date <= r.to));
}

/** True when the activity can be done on this date: started, not paused, and on a scheduled weekday. */
export function isScheduled(a: Activity, date: ISODate): boolean {
  if (date < a.startDate || isPaused(a, date)) return false;
  if (a.frequency.type === 'weekdays') return a.frequency.days.includes(dayOfWeek(date));
  return true;
}

const isDone = (map: CheckInMap, date: ISODate) => map.get(date)?.completed === true;

function weekCount(map: CheckInMap, start: ISODate): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isDone(map, addDays(start, i))) n++;
  return n;
}

/** How a single day should be shown on the calendar. */
export function dayStatus(a: Activity, map: CheckInMap, date: ISODate, today: ISODate): DayStatus {
  if (date > today) return 'future';
  if (date < a.startDate) return 'before';
  const c = map.get(date);
  if (c?.completed) return 'done';
  if (isPaused(a, date)) return 'paused';
  if (!isScheduled(a, date)) return 'notDue';
  if (c && (c.quantity ?? 0) > 0) return 'partial';
  if (date === today) return 'pending';
  // "X times a week" has no fixed days, so an empty day is a rest day rather than a miss.
  return a.frequency.type === 'timesPerWeek' ? 'notDue' : 'missed';
}

export interface StreakResult {
  current: number;
  longest: number;
  /** Longest streak that has already ended, or 0 if no streak has ended yet. */
  previousBest: number;
  unit: 'day' | 'week';
}

/**
 * Current and longest streak.
 * - Daily / chosen weekdays: consecutive scheduled days completed. Unscheduled and paused days are skipped.
 * - X times a week: consecutive weeks in which the weekly goal was met.
 * - Today (or this week) being incomplete never breaks a streak until it is over.
 */
export function computeStreak(a: Activity, map: CheckInMap, today: ISODate, weekStartsOn: 0 | 1): StreakResult {
  let run = 0;
  let longest = 0;
  let previousBest = 0;
  const breakRun = () => {
    previousBest = Math.max(previousBest, run);
    run = 0;
  };

  if (a.frequency.type === 'timesPerWeek') {
    const goal = a.frequency.count;
    const thisWeek = weekStart(today, weekStartsOn);
    for (let w = weekStart(a.startDate, weekStartsOn); w <= thisWeek; w = addDays(w, 7)) {
      if (weekCount(map, w) >= goal) {
        run++;
        longest = Math.max(longest, run);
        continue;
      }
      if (w === thisWeek) continue;
      // Weeks that were not fully available (started mid-week or paused) cannot break a streak.
      let fullyAvailable = true;
      for (let i = 0; i < 7; i++) if (!isScheduled(a, addDays(w, i))) fullyAvailable = false;
      if (fullyAvailable) breakRun();
    }
    return { current: run, longest, previousBest, unit: 'week' };
  }

  for (let d = a.startDate; d <= today; d = addDays(d, 1)) {
    if (isDone(map, d)) {
      run++;
      longest = Math.max(longest, run);
    } else if (isScheduled(a, d) && d !== today) {
      breakRun();
    }
  }
  return { current: run, longest, previousBest, unit: 'day' };
}

/** Share of scheduled days completed over the last `days` days (0–1), or null if nothing was scheduled. */
export function completionRate(a: Activity, map: CheckInMap, today: ISODate, days: number): number | null {
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (d < a.startDate) break;
    const completed = isDone(map, d);
    if (completed) done++;
    if (!isScheduled(a, d)) continue;
    if (d === today && !completed) continue; // today is not over yet
    scheduled++;
  }
  if (a.frequency.type === 'timesPerWeek') {
    const expected = (scheduled * a.frequency.count) / 7;
    return expected === 0 ? null : Math.min(1, done / expected);
  }
  return scheduled === 0 ? null : Math.min(1, done / scheduled);
}

/** Completions in the week containing `date`. */
export function weeklyProgress(map: CheckInMap, date: ISODate, weekStartsOn: 0 | 1): number {
  return weekCount(map, weekStart(date, weekStartsOn));
}

/** True when the activity is scheduled for `date`, not yet done, and (for weekly goals) the goal is still open. */
export function needsAction(a: Activity, map: CheckInMap, date: ISODate, weekStartsOn: 0 | 1): boolean {
  if (a.status !== 'active' || !isScheduled(a, date) || isDone(map, date)) return false;
  if (a.frequency.type === 'timesPerWeek') return weeklyProgress(map, date, weekStartsOn) < a.frequency.count;
  return true;
}

/** "10 pages", "4 pages left", or "" when the activity has no target. */
export function remainingLabel(a: Activity, c: CheckIn | undefined): string {
  if (!a.targetQuantity) return '';
  const unit = a.unit ?? 'times';
  const left = Math.max(0, a.targetQuantity - (c?.quantity ?? 0));
  return left === a.targetQuantity ? `${a.targetQuantity} ${unit}` : `${left} ${unit} left`;
}

/** How many missed days can be excused per activity in one calendar month. */
export const STREAK_PAUSES_PER_MONTH = 2;

export function streakPausesLeft(a: Activity, month: string): number {
  const used = (a.skippedDays ?? []).filter((d) => d.startsWith(month)).length;
  return Math.max(0, STREAK_PAUSES_PER_MONTH - used);
}

export interface StreakPauseOffer {
  /** The day that would be excused. */
  date: ISODate;
  /** The streak the user keeps by excusing it. */
  streak: number;
  left: number;
}

/**
 * Decides whether to offer "pause streak for a day". It is offered only when a streak has just broken
 * (the last scheduled day was not logged) or is about to (today is still not logged late in the evening),
 * only while pauses remain for that month, and only if pausing actually saves a streak.
 */
export function streakPauseOffer(a: Activity, map: CheckInMap, today: ISODate, weekStartsOn: 0 | 1, hour: number): StreakPauseOffer | null {
  if (a.status !== 'active' || a.frequency.type === 'timesPerWeek') return null;

  let candidate: ISODate | null = null;
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, -i);
    if (d < a.startDate) break;
    if (!isScheduled(a, d)) continue;
    if (!isDone(map, d)) candidate = d;
    break;
  }
  const current = computeStreak(a, map, today, weekStartsOn).current;
  if (!candidate && hour >= 21 && current > 0 && isScheduled(a, today) && !isDone(map, today)) candidate = today;
  if (!candidate) return null;

  const left = streakPausesLeft(a, candidate.slice(0, 7));
  if (left === 0) return null;
  const saved = computeStreak({ ...a, skippedDays: [...(a.skippedDays ?? []), candidate] }, map, today, weekStartsOn).current;
  if (saved === 0 || (candidate !== today && saved <= current)) return null;
  return { date: candidate, streak: saved, left };
}

export interface PlannedReminder {
  activityId: string;
  date: ISODate;
  at: Date;
  kind: 'main' | 'followUp';
  title: string;
  body: string;
}

/**
 * Works out which reminders should be scheduled from `now` for the next `daysAhead` days.
 * Today's reminders are only planned while the activity is still incomplete; the plan is rebuilt after
 * every change, so marking something done removes its remaining reminders for the day.
 */
export function planReminders(
  activities: Activity[],
  maps: ReadonlyMap<string, CheckInMap>,
  now: Date,
  today: ISODate,
  daysAhead: number,
  weekStartsOn: 0 | 1,
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const empty: CheckInMap = new Map();
  for (const a of activities) {
    if (a.status !== 'active' || (!a.reminder.enabled && !a.reminder.followUpTime)) continue;
    const map = maps.get(a.id) ?? empty;
    const streak = computeStreak(a, map, today, weekStartsOn);
    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(today, i);
      const due = i === 0 ? needsAction(a, map, date, weekStartsOn) : isScheduled(a, date);
      if (!due) continue;
      const times: [PlannedReminder['kind'], string | undefined][] = [
        ['main', a.reminder.enabled ? a.reminder.time : undefined],
        ['followUp', a.reminder.followUpTime],
      ];
      for (const [kind, time] of times) {
        if (!time) continue;
        const at = atTime(date, time);
        if (at <= now) continue;
        const left = remainingLabel(a, i === 0 ? map.get(date) : undefined);
        const what = left ? `${left.replace(' left', '')} still to go today.` : 'Still to do today.';
        const keep =
          streak.current > 0 ? ` Keep your ${streak.current}-${streak.unit} streak going.` : '';
        out.push({
          activityId: a.id,
          date,
          at,
          kind,
          title: a.name,
          body: what + keep,
        });
      }
    }
  }
  return out.sort((x, y) => x.at.getTime() - y.at.getTime());
}
