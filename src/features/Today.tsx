import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../app/data';
import { useCelebrate } from '../components/Celebrate';
import { useNames } from '../app/privacy';
import { Check } from '../components/icons';
import { ProgressRing, StreakChip } from '../components/StreakChip';
import { PageHeader, useToast } from '../components/ui';
import { repo } from '../data/repo';
import { addDays, formatDate } from '../domain/dates';
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
  const { show } = useNames();
  const name = show(activity.name);
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

  // Progress text only while something is partly done; otherwise the ember streak chip speaks for itself.
  const status =
    target && !done
      ? `${qty}/${target}`
      : activity.frequency.type === 'timesPerWeek' && !done
        ? `${weeklyProgress(map, date, settings.weekStartsOn)}/${activity.frequency.count} wk`
        : '';

  function pauseStreak() {
    if (!offer) return;
    const day = offer.date;
    void repo.setSkippedDay(activity.id, day, true);
    toast({ message: `Streak kept: ${offer.streak} ${offer.streak === 1 ? 'day' : 'days'}`, actionLabel: 'Undo', onAction: () => void repo.setSkippedDay(activity.id, day, false) });
  }

  return (
    <li className={`card overflow-hidden transition-colors ${done ? '!bg-accent-soft/60' : ''}`}>
      <div className="flex items-center gap-3 py-2 pl-2.5 pr-3">
        <button
          type="button"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            void toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }}
          aria-pressed={done}
          aria-label={done ? `Mark ${name} as not done` : `Mark ${name} as done`}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition-colors ${done ? 'pop border-accent bg-accent text-on-accent' : 'border-accent/45 text-transparent hover:border-accent'}`}
        >
          <Check size={20} />
        </button>
        <Link to={`/activities/${activity.id}`} className="flex min-h-12 min-w-0 flex-1 items-center gap-2">
          <span className={`min-w-0 flex-1 truncate font-semibold ${done ? 'text-muted line-through decoration-1' : ''}`}>{name}</span>
          {status && <span className="shrink-0 text-sm font-semibold text-muted" aria-live="polite">{status}</span>}
          <StreakChip count={streak.current} unit={streak.unit} />
        </Link>
        {target && !done ? (
          <button type="button" onClick={() => void addProgress()} aria-label={`Add ${step} ${unit} to ${name}`} className="grid h-11 min-w-11 shrink-0 place-items-center rounded-full bg-accent-soft px-3 text-sm font-bold text-accent">
            +{step}
          </button>
        ) : null}
      </div>
      {offer && (
        <div className="flex items-center gap-3 border-t border-line bg-ember-soft/50 py-1.5 pl-4 pr-2">
          <p className="min-w-0 flex-1 text-sm">
            {offer.date === today ? 'Not today?' : `Missed ${formatDate(offer.date, { weekday: 'short' })}?`} Keep your {offer.streak}-day streak.{' '}
            <span className="text-muted">{offer.left} left this month</span>
          </p>
          <button type="button" onClick={pauseStreak} aria-label={`Pause streak for ${offer.date === today ? 'today' : formatDate(offer.date, { weekday: 'long' })}`} className="min-h-10 shrink-0 rounded-xl bg-surface px-3 text-sm font-bold text-ember ring-1 ring-line">
            Pause
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

  return (
    <>
      <PageHeader brand />
      <section className="flex items-center justify-between gap-4 px-5 pb-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent">{yesterday ? 'Yesterday' : 'Today'}</p>
          <h1 className="text-title font-bold">{formatDate(date, { weekday: 'long' })}</h1>
          <p className="text-muted">{formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        {due.length > 0 && <ProgressRing done={doneCount} total={due.length} />}
      </section>

      {due.length === 0 ? (
        <div className="card mx-5 p-5">
          <p className="font-semibold">{hasAny ? 'Nothing scheduled for this day' : 'Add your first activity'}</p>
          <p className="mt-1 text-muted">{hasAny ? 'Enjoy the rest day.' : 'For example, reading 10 pages a day.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 px-5" aria-label={doneCount === due.length ? 'All done' : `${doneCount} of ${due.length} done`}>
          {due.map((a) => <ActivityCard key={a.id} activity={a} date={date} isLast={due.length - doneCount === 1} />)}
        </ul>
      )}

      {settings.allowBackfillYesterday && hasAny && (
        <button type="button" onClick={() => setYesterday(!yesterday)} className="mx-5 mt-3 min-h-11 text-sm font-semibold text-accent">
          {yesterday ? 'Back to today' : 'Forgot to mark yesterday?'}
        </button>
      )}

      <Link
        to="/activities/new"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-[max(1.25rem,calc(50vw-15rem))] z-20 flex min-h-14 items-center gap-2 rounded-2xl bg-accent pl-4 pr-5 font-semibold text-on-accent shadow-lg"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        Add activity
      </Link>
    </>
  );
}
