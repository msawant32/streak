import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCheckIns, useData } from '../app/data';
import { useNames } from '../app/privacy';
import { Heatmap } from '../components/Heatmap';
import { Flame } from '../components/icons';
import { ReminderRow } from '../components/ReminderRow';
import { Button, Dialog, PageHeader, useToast } from '../components/ui';
import { repo } from '../data/repo';
import { frequencyLabel, targetLabel } from '../domain/labels';
import { completionRate, computeStreak } from '../domain/streaks';

export function ActivityDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { activities, today, settings } = useData();
  const { show } = useNames();
  const map = useCheckIns(id);
  const [noteOpen, setNoteOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const a = activities.find((x) => x.id === id);
  if (!a) return <Navigate to="/" replace />;

  const streak = computeStreak(a, map, today, settings.weekStartsOn);
  const units = (n: number) => `${n} ${streak.unit}${n === 1 ? '' : 's'}`;
  const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
  // "Previous best" only appears once a streak has ended; until then the 7-day rate takes its place.
  const stats: [string, string][] = [
    streak.previousBest > 0 ? [units(streak.previousBest), 'Previous best'] : [pct(completionRate(a, map, today, 7)), '7 days'],
    [pct(completionRate(a, map, today, 30)), '30 days'],
  ];
  const note = map.get(today)?.note ?? '';
  const r = a.reminder;
  const secondDefault = settings.defaultSecondReminderTime ?? '20:00';
  const setReminder = (patch: Partial<typeof r>) => {
    void repo.updateActivity(a.id, { reminder: { ...r, ...patch } });
    toast({ message: 'Reminder updated' });
  };

  return (
    <>
      <PageHeader
        title={show(a.name)}
        sub={[targetLabel(a), frequencyLabel(a.frequency), a.status !== 'active' ? 'Paused' : ''].filter(Boolean).join(', ')}
        back
        action={<Link to={`/activities/${a.id}/edit`} className="grid min-h-11 place-items-center rounded-full px-3 font-semibold text-accent">Edit</Link>}
      />

      <div className="flex flex-col gap-3 px-5">
        <div className="card flex items-stretch overflow-hidden">
          <div className="flex flex-1 items-center gap-2 bg-ember-soft px-3 py-2.5 text-ember">
            <Flame size={20} />
            <div>
              <p className="whitespace-nowrap font-bold">{units(streak.current)}</p>
              <p className="text-sm">Current</p>
            </div>
          </div>
          {stats.map(([v, l]) => (
            <div key={l} className="flex-1 border-l border-line px-3 py-2.5">
              <p className="whitespace-nowrap font-bold">{v}</p>
              <p className="whitespace-nowrap text-sm text-muted">{l}</p>
            </div>
          ))}
        </div>

        <div className="card px-3 pb-2">
          <Heatmap activity={a} map={map} today={today} weekStartsOn={settings.weekStartsOn} />
        </div>

        <div className="card px-4 py-1">
          <ReminderRow id="d-reminder-1" label="Reminder 1" on={r.enabled} time={r.time} onToggle={(enabled) => setReminder({ enabled })} onTime={(time) => setReminder({ time })} />
          <div className="border-t border-line" />
          <ReminderRow
            id="d-reminder-2"
            label="Reminder 2"
            on={Boolean(r.followUpTime)}
            time={r.followUpTime ?? secondDefault}
            onToggle={(on) => setReminder({ followUpTime: on ? secondDefault : undefined })}
            onTime={(followUpTime) => setReminder({ followUpTime })}
          />
          <div className="border-t border-line" />
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
            onClick={() => {
              setDraft(note);
              setNoteOpen(true);
            }}
          >
            <span className="shrink-0 font-semibold">Today's note</span>
            <span className="truncate text-sm text-muted">{note || 'Add'}</span>
          </button>
        </div>
      </div>

      {noteOpen && (
        <Dialog title="Today's note" onClose={() => setNoteOpen(false)}>
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const next = draft.trim();
              if (next !== note) {
                void repo.saveCheckIn(a.id, today, { note: next || undefined });
                toast({ message: 'Note saved' });
              }
              setNoteOpen(false);
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
