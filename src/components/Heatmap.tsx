import { useState } from 'react';
import { addDays, dayOfWeek, formatDate, fromISO, toISO } from '../domain/dates';
import { dayStatus, type CheckInMap, type DayStatus } from '../domain/streaks';
import type { Activity, ISODate } from '../domain/types';

const NAMES: Partial<Record<DayStatus, string>> = { done: 'Done', partial: 'Started', missed: 'Missed', paused: 'Paused', notDue: 'Not scheduled', pending: 'To do' };

function cellStyle(s: DayStatus, color: string): React.CSSProperties {
  switch (s) {
    case 'done':
      return { background: color, color: 'var(--on-accent)' };
    case 'partial':
      return { background: `color-mix(in srgb, ${color} 28%, transparent)`, border: `2px solid ${color}` };
    case 'missed':
      return { background: 'var(--sunk)', color: 'var(--muted)', textDecoration: 'line-through' };
    case 'pending':
      return { border: '2px solid var(--accent)' };
    case 'paused':
      return { color: 'var(--muted)', opacity: 0.45 };
    default:
      return { color: 'var(--muted)', opacity: s === 'notDue' ? 0.8 : 0.45 };
  }
}

/** Month calendar showing how each day went. */
export function Heatmap({ activity, map, today, weekStartsOn }: { activity: Activity; map: CheckInMap; today: ISODate; weekStartsOn: 0 | 1 }) {
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const first = `${month}-01`;
  const start = fromISO(first);
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const lead = (dayOfWeek(first) - weekStartsOn + 7) % 7;
  const shift = (n: number) => setMonth(toISO(new Date(start.getFullYear(), start.getMonth() + n, 1, 12)).slice(0, 7));
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(addDays('2024-01-07', i + weekStartsOn), { weekday: 'narrow' }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="grid h-12 w-12 place-items-center rounded-full text-accent">‹</button>
        <p className="font-semibold" aria-live="polite">{formatDate(first, { month: 'long', year: 'numeric' })}</p>
        <button type="button" aria-label="Next month" onClick={() => shift(1)} disabled={month >= today.slice(0, 7)} className="grid h-12 w-12 place-items-center rounded-full text-accent disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {weekdays.map((w, i) => (
          <span key={i} className="pb-1 text-sm text-muted" aria-hidden="true">{w}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = addDays(first, i);
          const s = dayStatus(activity, map, date, today);
          return (
            <span
              key={date}
              className="grid h-8 place-items-center rounded-lg text-sm font-semibold"
              style={cellStyle(s, 'var(--accent)')}
              aria-label={`${formatDate(date, { month: 'long', day: 'numeric' })}${NAMES[s] ? `: ${NAMES[s]}` : ''}`}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-hidden="true">
        {(['done', 'missed'] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded" style={cellStyle(s, 'var(--accent)')} />
            {NAMES[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
