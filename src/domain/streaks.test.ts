import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, weekStart } from './dates';
import { completionRate, computeStreak, dayStatus, needsAction, planReminders, streakPauseOffer, toCheckInMap } from './streaks';
import type { Activity, CheckIn } from './types';

const base: Activity = {
  id: 'a1',
  name: 'Read a book',
  targetQuantity: 10,
  unit: 'pages',
  frequency: { type: 'daily' },
  reminder: { enabled: true, time: '08:00' },
  startDate: '2026-01-01',
  color: '#1F6F5C',
  icon: '📖',
  status: 'active',
  pausedRanges: [],
  createdAt: '',
  updatedAt: '',
};

const done = (...dates: string[]) =>
  toCheckInMap(
    dates.map<CheckIn>((date) => ({ id: date, activityId: 'a1', date, completed: true, createdAt: '', updatedAt: '' })),
  );

describe('dates', () => {
  it('adds days across DST changes, month ends and leap days', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08'); // US spring forward
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // US fall back
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('finds the start of the week', () => {
    expect(dayOfWeek('2026-11-15')).toBe(0); // Sunday
    expect(weekStart('2026-11-15', 1)).toBe('2026-11-09');
    expect(weekStart('2026-11-15', 0)).toBe('2026-11-15');
  });
});

describe('daily streaks', () => {
  it('counts consecutive completed days', () => {
    const s = computeStreak(base, done('2026-01-01', '2026-01-02', '2026-01-03'), '2026-01-03', 1);
    expect(s).toEqual({ current: 3, longest: 3, previousBest: 0, unit: 'day' });
  });
  it('does not break while today is still open', () => {
    const s = computeStreak(base, done('2026-01-01', '2026-01-02'), '2026-01-03', 1);
    expect(s.current).toBe(2);
  });
  it('breaks after a missed day and remembers the longest run', () => {
    const s = computeStreak(base, done('2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05'), '2026-01-05', 1);
    expect(s).toEqual({ current: 1, longest: 3, previousBest: 3, unit: 'day' });
  });
  it('is zero when yesterday was missed and today is not done', () => {
    expect(computeStreak(base, done('2026-01-01'), '2026-01-03', 1).current).toBe(0);
  });
  it('skips paused days', () => {
    const a = { ...base, pausedRanges: [{ from: '2026-01-03', to: '2026-01-04' }] };
    const s = computeStreak(a, done('2026-01-01', '2026-01-02', '2026-01-05'), '2026-01-05', 1);
    expect(s.current).toBe(3);
  });
  it('survives a daylight-saving change', () => {
    const days = ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09'];
    expect(computeStreak({ ...base, startDate: '2026-03-06' }, done(...days), '2026-03-09', 1).current).toBe(4);
  });
});

describe('weekday streaks', () => {
  const a: Activity = { ...base, startDate: '2026-11-02', frequency: { type: 'weekdays', days: [1, 3, 5] } };
  it('ignores days that are not scheduled', () => {
    // Mon 2, Wed 4, Fri 6, Mon 9
    const s = computeStreak(a, done('2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'), '2026-11-10', 1);
    expect(s.current).toBe(4);
  });
  it('breaks when a scheduled day is missed', () => {
    const s = computeStreak(a, done('2026-11-02', '2026-11-06'), '2026-11-07', 1);
    expect(s).toEqual({ current: 1, longest: 1, previousBest: 1, unit: 'day' });
  });
});

describe('times-per-week streaks', () => {
  const a: Activity = { ...base, startDate: '2026-10-26', frequency: { type: 'timesPerWeek', count: 2 } };
  it('counts weeks where the goal was met and keeps the current week open', () => {
    const map = done('2026-10-26', '2026-10-28', '2026-11-03', '2026-11-05', '2026-11-09');
    expect(computeStreak(a, map, '2026-11-10', 1)).toEqual({ current: 2, longest: 2, previousBest: 0, unit: 'week' });
  });
  it('breaks on a full week below the goal', () => {
    const map = done('2026-10-26', '2026-10-28', '2026-11-03', '2026-11-09', '2026-11-10');
    expect(computeStreak(a, map, '2026-11-10', 1).current).toBe(1);
  });
  it('stops asking once the weekly goal is met', () => {
    expect(needsAction(a, done('2026-11-09', '2026-11-10'), '2026-11-11', 1)).toBe(false);
    expect(needsAction(a, done('2026-11-09'), '2026-11-11', 1)).toBe(true);
  });
});

describe('completion rate and day status', () => {
  it('excludes an unfinished today', () => {
    expect(completionRate(base, done('2026-01-01', '2026-01-02'), '2026-01-04', 7)).toBeCloseTo(2 / 3);
  });
  it('returns null before anything was scheduled', () => {
    expect(completionRate({ ...base, startDate: '2026-01-04' }, done(), '2026-01-04', 7)).toBeNull();
  });
  it('labels days', () => {
    const partial = toCheckInMap([
      { id: 'p', activityId: 'a1', date: '2026-01-02', quantity: 4, completed: false, createdAt: '', updatedAt: '' },
    ]);
    expect(dayStatus(base, done('2026-01-01'), '2026-01-01', '2026-01-03')).toBe('done');
    expect(dayStatus(base, partial, '2026-01-02', '2026-01-03')).toBe('partial');
    expect(dayStatus(base, done(), '2026-01-02', '2026-01-03')).toBe('missed');
    expect(dayStatus(base, done(), '2026-01-03', '2026-01-03')).toBe('pending');
    expect(dayStatus(base, done(), '2026-01-04', '2026-01-03')).toBe('future');
    expect(dayStatus(base, done(), '2025-12-31', '2026-01-03')).toBe('before');
  });
});

describe('reminders', () => {
  const now = new Date(2026, 0, 3, 7, 0);
  it('plans the 8:00 reminder for an unfinished activity', () => {
    const plan = planReminders([base], new Map(), now, '2026-01-03', 2, 1);
    expect(plan).toHaveLength(2);
    expect(plan[0].at).toEqual(new Date(2026, 0, 3, 8, 0));
    expect(plan[0].body).toContain('10 pages');
  });
  it('drops today once the activity is done', () => {
    const plan = planReminders([base], new Map([['a1', done('2026-01-03')]]), now, '2026-01-03', 2, 1);
    expect(plan.map((p) => p.date)).toEqual(['2026-01-04']);
  });
  it('skips times that already passed, paused activities and disabled reminders', () => {
    const late = new Date(2026, 0, 3, 9, 0);
    expect(planReminders([base], new Map(), late, '2026-01-03', 1, 1)).toHaveLength(0);
    expect(planReminders([{ ...base, status: 'paused' }], new Map(), now, '2026-01-03', 1, 1)).toHaveLength(0);
    const off = { ...base, reminder: { enabled: false, time: '08:00' } };
    expect(planReminders([off], new Map(), now, '2026-01-03', 1, 1)).toHaveLength(0);
  });
  it('adds the follow-up nudge and mentions the streak', () => {
    const a = { ...base, reminder: { enabled: true, time: '08:00', followUpTime: '20:00' } };
    const plan = planReminders([a], new Map([['a1', done('2026-01-01', '2026-01-02')]]), now, '2026-01-03', 1, 1);
    expect(plan.map((p) => p.kind)).toEqual(['main', 'followUp']);
    expect(plan[0].body).toContain('2-day streak');
  });
});

describe('pause streak for a day', () => {
  const three = done('2026-01-01', '2026-01-02', '2026-01-03');
  it('is not offered while nothing was missed', () => {
    expect(streakPauseOffer(base, three, '2026-01-04', 0, 10)).toBeNull();
  });
  it('is offered the day after a missed day and restores the streak', () => {
    expect(streakPauseOffer(base, three, '2026-01-05', 0, 10)).toEqual({ date: '2026-01-04', streak: 3, left: 2 });
    const saved = { ...base, skippedDays: ['2026-01-04'] };
    expect(computeStreak(saved, three, '2026-01-05', 0).current).toBe(3);
    expect(streakPauseOffer(saved, three, '2026-01-05', 0, 10)).toBeNull();
  });
  it('is offered late in the evening when today is still not logged', () => {
    expect(streakPauseOffer(base, three, '2026-01-04', 0, 20)).toBeNull();
    expect(streakPauseOffer(base, three, '2026-01-04', 0, 21)).toEqual({ date: '2026-01-04', streak: 3, left: 2 });
  });
  it('is limited to twice a month', () => {
    const used = { ...base, skippedDays: ['2026-01-10', '2026-01-20'] };
    const map = done('2026-01-21', '2026-01-22');
    expect(streakPauseOffer(used, map, '2026-01-24', 0, 10)).toBeNull();
    const once = { ...base, skippedDays: ['2026-01-10'] };
    expect(streakPauseOffer(once, map, '2026-01-24', 0, 10)?.left).toBe(1);
  });
  it('is not offered when there was no streak to save, or two days were missed', () => {
    expect(streakPauseOffer(base, done(), '2026-01-05', 0, 10)).toBeNull();
    expect(streakPauseOffer(base, three, '2026-01-06', 0, 10)).toBeNull();
  });
});

describe('previous best', () => {
  it('is 0 while the first streak is still running', () => {
    expect(computeStreak(base, done('2026-01-01', '2026-01-02'), '2026-01-03', 0).previousBest).toBe(0);
  });
  it('is the longest streak that has ended, even if the current one is longer', () => {
    const map = done('2026-01-01', '2026-01-02', '2026-01-04', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09');
    expect(computeStreak(base, map, '2026-01-09', 0)).toMatchObject({ current: 4, longest: 4, previousBest: 2 });
  });
  it('counts a streak that just ended', () => {
    expect(computeStreak(base, done('2026-01-01', '2026-01-02', '2026-01-03'), '2026-01-05', 0)).toMatchObject({ current: 0, previousBest: 3 });
  });
});

describe('two reminders', () => {
  const now = new Date(2026, 0, 3, 7, 0);
  it('plans reminder 2 on its own when reminder 1 is off', () => {
    const a = { ...base, reminder: { enabled: false, time: '08:00', followUpTime: '20:00' } };
    const plan = planReminders([a], new Map(), now, '2026-01-03', 1, 0);
    expect(plan.map((p) => [p.kind, p.at.getHours()])).toEqual([['followUp', 20]]);
  });
  it('drops both once the activity is done', () => {
    const a = { ...base, reminder: { enabled: true, time: '08:00', followUpTime: '20:00' } };
    expect(planReminders([a], new Map([['a1', done('2026-01-03')]]), now, '2026-01-03', 1, 0)).toHaveLength(0);
  });
});
