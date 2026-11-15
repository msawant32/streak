import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../app/data';
import { useCelebrate } from '../components/Celebrate';
import { PageHeader, useToast } from '../components/ui';
import { repo } from '../data/repo';
import { addDays, formatDate } from '../domain/dates';
import { streakLabel } from '../domain/labels';
import { computeStreak, isScheduled, streakPauseOffer, weeklyProgress } from '../domain/streaks';
import type { Activity, CheckIn, ISODate } from '../domain/types';
import { buzz } from '../platform/native';

const MILESTONES = [7, 30, 100, 365];
const EMPTY = new Map<ISODate, CheckIn>();

/** One activity: tap the circle to mark it done. That is the whole interaction. */
function ActivityCard({ activity, date, isLast }: { activity: Activity; date: ISODate; isLast: boolean }) {
  const { maps, today, settings } = useData();
  const toast = useToast();
  const celebrate = useCelebrate();
  const map = maps.get(activity.id) ?? EMPTY;
  const checkIn = map.get(date);
  const done = checkIn?.completed === true;
  const streak = computeStreak(activity, map, today, settings.weekStartsOn);
  const target = activity.targetQuantity;
  const qty = checkIn?.quantity ?? 0;
  const unit = activity.unit ?? 'times';
  const step = target && target >= 20 ? 5 : 1;
  // Shown only when a streak has just broken or is about to. Never advertised otherwise.
  const offer = date === today ? streakPauseOffer(activity, map, today, settings.weekStartsOn, new Date().getHours()) : null;

  const undoable = (message: string) =>
    toast({ message, actionLabel: 'Undo', onAction: () => void repo.restoreCheckIn(activity.id, date, checkIn) });

  async function toggle(origin: { x: number; y: number }) {
    if (done) {
      await repo.saveCheckIn(activity.id, date, { completed: false, quantity: target ? 0 : undefined });
      undoable('Marked not done');
      return;
    }
    await repo.markDone(activity, date);
    const next = computeStreak(
      activity,
      new Map(map).set(date, { ...(checkIn ?? { id: '', activityId: activity.id, date, createdAt: '', updatedAt: '' }), completed: true }),
      today,
      settings.weekStartsOn,
    );
    const milestone = next.unit === 'day' && MILESTONES.includes(next.current) && next.current > streak.current;
    buzz(milestone ? 'milestone' : 'done');
    celebrate(origin, milestone ? `${next.current} days in a row` : isLast ? 'All done for today' : undefined);
    undoable('Marked done');
  }

  async function addProgress() {
    const next = qty + step;
    await repo.logQuantity(activity, date, next);
    if (target && next >= target) {
      buzz('done');
      undoable('Marked done');
    }
  }

  // One quiet line under the name: progress if there is a target, otherwise the streak.
  const status = done
    ? streakLabel(streak.current, streak.unit)
    : target
      ? `${qty} of ${target} ${unit}`
      : activity.frequency.type === 'timesPerWeek'
        ? `${weeklyProgress(map, date, settings.weekStartsOn)} of ${activity.frequency.count} this week`
        : streakLabel(streak.current, streak.unit);

  function pauseStreak() {
    if (!offer) return;
    const day = offer.date;
    void repo.setSkippedDay(activity.id, day, true);
    toast({ message: `Streak kept: ${offer.streak} ${offer.streak === 1 ? 'day' : 'days'}`, actionLabel: 'Undo', onAction: () => void repo.setSkippedDay(activity.id, day, false) });
  }

  return (
    <li className="card">
      <div className="flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          void toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }}
        aria-pressed={done}
        aria-label={done ? `Mark ${activity.name} as not done` : `Mark ${activity.name} as done`}
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 ${done ? 'pop border-accent bg-accent text-on-accent' : 'border-accent text-transparent'}`}
      >
        <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M5.5 13.5 11 19l10-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Link to={`/activities/${activity.id}`} className="min-w-0 flex-1 py-1">
        <p className={`truncate font-semibold ${done ? 'text-muted' : ''}`}>{activity.name}</p>
        <p className="truncate text-sm text-muted" aria-live="polite">{status}</p>
      </Link>
      {target && !done ? (
        <button
          type="button"
          onClick={() => void addProgress()}
          aria-label={`Add ${step} ${unit} to ${activity.name}`}
          className="min-h-12 shrink-0 rounded-full bg-sunk px-4 font-semibold"
        >
          +{step}
        </button>
      ) : null}
      </div>
      {offer && (
        <div className="border-t border-line p-3">
          <p className="text-sm text-muted">
            {offer.date === today ? 'Not doing this today?' : `You missed ${formatDate(offer.date, { weekday: 'long' })}.`} Pause your streak for that day to keep {offer.streak} {offer.streak === 1 ? 'day' : 'days'}. {offer.left} of 2 left this month.
          </p>
          <button type="button" onClick={pauseStreak} className="mt-2 min-h-12 w-full rounded-full bg-sunk px-4 font-semibold">
            Pause streak for {offer.date === today ? 'today' : formatDate(offer.date, { weekday: 'long' })}
          </button>
        </div>
      )}
    </li>
  );
}

export function Today() {
  const { activities, maps, today, settings } = useData();
  const [yesterday, setYesterday] = useState(false);
  const date = yesterday && settings.allowBackfillYesterday ? addDays(today, -1) : today;
  const due = activities.filter((a) => a.status === 'active' && isScheduled(a, date));
  const doneCount = due.filter((a) => maps.get(a.id)?.get(date)?.completed).length;
  const hasAny = activities.some((a) => a.status === 'active');

  const sub =
    due.length === 0 ? formatDate(date, { month: 'long', day: 'numeric' })
    : doneCount === due.length ? 'All done'
    : `${doneCount} of ${due.length} done`;

  return (
    <>
      <PageHeader title={yesterday ? 'Yesterday' : formatDate(date, { weekday: 'long' })} sub={sub} />

      {due.length === 0 ? (
        <div className="px-5">
          <p className="font-semibold">{hasAny ? 'Nothing scheduled for this day' : 'Add your first activity'}</p>
          <p className="mt-1 text-muted">{hasAny ? 'Enjoy the rest day.' : 'For example, reading 10 pages a day.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 px-5">
          {due.map((a) => <ActivityCard key={a.id} activity={a} date={date} isLast={due.length - doneCount === 1} />)}
        </ul>
      )}

      {settings.allowBackfillYesterday && hasAny && (
        <button type="button" onClick={() => setYesterday(!yesterday)} className="mx-5 mt-4 min-h-12 text-sm font-semibold text-accent">
          {yesterday ? 'Back to today' : 'Forgot to mark yesterday?'}
        </button>
      )}

      <Link
        to="/activities/new"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1.25rem,calc(50vw-15rem))] z-20 grid min-h-14 place-items-center rounded-full bg-accent px-6 font-semibold text-on-accent shadow-md"
      >
        Add activity
      </Link>
    </>
  );
}
