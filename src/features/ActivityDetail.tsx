import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCheckIns, useData } from '../app/data';
import { Heatmap } from '../components/Heatmap';
import { Button, Dialog, PageHeader, Switch, useToast } from '../components/ui';
import { repo } from '../data/repo';
import { formatTime } from '../domain/dates';
import { frequencyLabel, targetLabel } from '../domain/labels';
import { completionRate, computeStreak } from '../domain/streaks';

export function ActivityDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { activities, today, settings } = useData();
  const map = useCheckIns(id);
  const [open, setOpen] = useState<'reminder' | 'note' | null>(null);
  const [draft, setDraft] = useState('');
  const a = activities.find((x) => x.id === id);
  if (!a) return <Navigate to="/" replace />;

  const streak = computeStreak(a, map, today, settings.weekStartsOn);
  const units = (n: number) => `${n} ${streak.unit}${n === 1 ? '' : 's'}`;
  const month = completionRate(a, map, today, 30);
  const note = map.get(today)?.note ?? '';
  const stats = [
    [units(streak.current), 'Current'],
    [units(streak.longest), 'Longest'],
    [month === null ? '–' : `${Math.round(month * 100)}%`, '30 days'],
  ];
  const row = 'flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left';

  return (
    <>
      <PageHeader
        title={a.name}
        sub={[targetLabel(a), frequencyLabel(a.frequency), a.status !== 'active' ? 'Paused' : ''].filter(Boolean).join(', ')}
        back
        action={<Link to={`/activities/${a.id}/edit`} className="grid min-h-12 place-items-center rounded-full px-3 font-semibold text-accent">Edit</Link>}
      />

      <div className="flex flex-col gap-3 px-5">
        <dl className="grid grid-cols-3 gap-2">
          {stats.map(([v, l], i) => (
            <div key={l} className={i === 0 ? 'rounded-2xl bg-accent p-3 text-on-accent' : 'card p-3'}>
              <dd className="font-bold">{v}</dd>
              <dt className={`text-sm ${i === 0 ? '' : 'text-muted'}`}>{l}</dt>
            </div>
          ))}
        </dl>

        <div className="card px-3 pb-3">
          <Heatmap activity={a} map={map} today={today} weekStartsOn={settings.weekStartsOn} />
        </div>

        <div className="card divide-y divide-line">
          <button type="button" className={row} onClick={() => setOpen('reminder')}>
            <span className="font-semibold">Reminder</span>
            <span className="text-sm text-muted">{a.reminder.enabled ? formatTime(a.reminder.time) : 'Off'}</span>
          </button>
          <button
            type="button"
            className={row}
            onClick={() => {
              setDraft(note);
              setOpen('note');
            }}
          >
            <span className="shrink-0 font-semibold">Today's note</span>
            <span className="truncate text-sm text-muted">{note || 'Add'}</span>
          </button>
        </div>
      </div>

      {open === 'reminder' && (
        <Dialog title="Reminder" onClose={() => setOpen(null)}>
          <div className="mt-3 flex items-center justify-between gap-3">
            {a.reminder.enabled ? (
              <input
                type="time"
                className="field !w-40"
                aria-label="Reminder time"
                value={a.reminder.time}
                onChange={(e) => e.target.value && void repo.updateActivity(a.id, { reminder: { ...a.reminder, time: e.target.value } })}
              />
            ) : (
              <span className="text-muted">Off</span>
            )}
            <Switch checked={a.reminder.enabled} onChange={(enabled) => void repo.updateActivity(a.id, { reminder: { ...a.reminder, enabled } })} label="Reminder" />
          </div>
          <Button className="mt-5 w-full" onClick={() => setOpen(null)}>Done</Button>
        </Dialog>
      )}

      {open === 'note' && (
        <Dialog title="Today's note" onClose={() => setOpen(null)}>
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const next = draft.trim();
              if (next !== note) {
                void repo.saveCheckIn(a.id, today, { note: next || undefined });
                toast({ message: 'Note saved' });
              }
              setOpen(null);
            }}
          >
            <input autoFocus className="field" maxLength={280} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="For example: finished chapter 3" aria-label="Today's note" />
            <Button type="submit" className="mt-5 w-full">Save note</Button>
          </form>
        </Dialog>
      )}
    </>
  );
}
