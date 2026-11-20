import { Link } from 'react-router-dom';
import { useData } from '../app/data';
import { useNames } from '../app/privacy';
import { StreakChip } from '../components/StreakChip';
import { PageHeader, Section } from '../components/ui';
import { frequencyLabel } from '../domain/labels';
import { completionRate, computeStreak, isScheduled } from '../domain/streaks';
import type { Activity } from '../domain/types';

export function Progress() {
  const { activities, maps, today, settings } = useData();
  const { show } = useNames();
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
        <PageHeader brand title="Progress" />
        <p className="px-5 text-muted">Your streaks appear here once you add an activity.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader brand title="Progress" />
      <div className="px-5 pb-4">
        <dl className="card flex overflow-hidden">
          {[
            [`${doneToday}/${dueToday.length}`, 'Done today'],
            [String(running), 'Running'],
            [`${best} ${best === 1 ? 'day' : 'days'}`, 'Best streak'],
          ].map(([v, l], i) => (
            <div key={l} className={`flex-1 px-3 py-2.5 ${i > 0 ? 'border-l border-line' : ''}`}>
              <dd className="whitespace-nowrap font-bold">{v}</dd>
              <dt className="whitespace-nowrap text-sm text-muted">{l}</dt>
            </div>
          ))}
        </dl>
      </div>

      {active.length > 0 && (
        <Section title="Last 30 days">
          <ul className="card divide-y divide-line">
            {active.map(({ a, streak, month }) => (
              <li key={a.id}>
                <Link to={`/activities/${a.id}`} className="flex min-h-13 items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{show(a.name)}</span>
                  <StreakChip count={streak.current} unit={streak.unit} />
                  <span className="w-16 shrink-0" aria-label={month === null ? 'No history yet' : `${Math.round(month * 100)} percent in the last 30 days`}>
                    <span className="block text-right text-sm font-semibold">{month === null ? '–' : `${Math.round(month * 100)}%`}</span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sunk">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round((month ?? 0) * 100)}%` }} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {resting.length > 0 && (
        <Section title="Paused">
          <ul className="card divide-y divide-line">
            {resting.map((a) => (
              <li key={a.id}>
                <Link to={`/activities/${a.id}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2">
                  <span className="truncate font-semibold text-muted">{show(a.name)}</span>
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
