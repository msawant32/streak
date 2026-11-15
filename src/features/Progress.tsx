import { Link } from 'react-router-dom';
import { useData } from '../app/data';
import { PageHeader, Section } from '../components/ui';
import { frequencyLabel, streakLabel } from '../domain/labels';
import { completionRate, computeStreak, isScheduled } from '../domain/streaks';
import type { Activity } from '../domain/types';

export function Progress() {
  const { activities, maps, today, settings } = useData();
  const empty = new Map();
  const info = (a: Activity) => {
    const map = maps.get(a.id) ?? empty;
    return { a, streak: computeStreak(a, map, today, settings.weekStartsOn), month: completionRate(a, map, today, 30) };
  };
  const active = activities.filter((a) => a.status === 'active').map(info);
  const resting = activities.filter((a) => a.status !== 'active');

  const dueToday = active.filter((r) => isScheduled(r.a, today));
  const doneToday = dueToday.filter((r) => maps.get(r.a.id)?.get(today)?.completed).length;
  const running = active.filter((r) => r.streak.current > 0).length;
  const best = active.filter((r) => r.streak.unit === 'day').reduce((m, r) => Math.max(m, r.streak.longest), 0);

  if (activities.length === 0) {
    return (
      <>
        <PageHeader title="Progress" />
        <p className="px-5 text-muted">Your streaks appear here once you add an activity.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Progress" />
      <dl className="grid grid-cols-3 gap-2 px-5 pb-6">
        {[
          [`${doneToday} of ${dueToday.length}`, 'Done today'],
          [String(running), 'Streaks running'],
          [`${best} ${best === 1 ? 'day' : 'days'}`, 'Best streak'],
        ].map(([v, l]) => (
          <div key={l} className="card p-3">
            <dd className="font-bold">{v}</dd>
            <dt className="text-sm text-muted">{l}</dt>
          </div>
        ))}
      </dl>

      {active.length > 0 && (
        <Section title="Activities">
          <ul className="card divide-y divide-line">
            {active.map(({ a, streak, month }) => (
              <li key={a.id}>
                <Link to={`/activities/${a.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.name}</span>
                    <span className="block truncate text-sm text-muted">{streakLabel(streak.current, streak.unit)}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted" aria-label={month === null ? 'No history yet' : `${Math.round(month * 100)} percent in the last 30 days`}>
                    {month === null ? '' : `${Math.round(month * 100)}%`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">The percentage is the share of scheduled days you completed in the last 30 days.</p>
        </Section>
      )}

      {resting.length > 0 && (
        <Section title="Paused">
          <ul className="card divide-y divide-line">
            {resting.map((a) => (
              <li key={a.id}>
                <Link to={`/activities/${a.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                  <span className="truncate font-semibold text-muted">{a.name}</span>
                  <span className="shrink-0 text-sm text-muted">{frequencyLabel(a.frequency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
