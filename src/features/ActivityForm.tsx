import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../app/data';
import { Button, Dialog, PageHeader, Segmented, Switch, useToast } from '../components/ui';
import { repo, type ActivityInput } from '../data/repo';
import { COLORS, ICONS, type Frequency } from '../domain/types';
import { reminderPermission, requestReminderPermission } from '../platform/reminders';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-semibold text-danger" role="alert">{error}</span>}
    </label>
  );
}

export function ActivityForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activities, settings, today } = useData();
  const existing = id ? activities.find((a) => a.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [details, setDetails] = useState(existing?.details ?? '');
  const [notesOpen, setNotesOpen] = useState(false);
  const [freqType, setFreqType] = useState<Frequency['type']>(existing?.frequency.type ?? 'daily');
  const [days, setDays] = useState<number[]>(existing?.frequency.type === 'weekdays' ? existing.frequency.days : [1, 3, 5]);
  const [count, setCount] = useState(existing?.frequency.type === 'timesPerWeek' ? existing.frequency.count : 3);
  const [remind, setRemind] = useState(existing?.reminder.enabled ?? true);
  const [time, setTime] = useState(existing?.reminder.time ?? settings.defaultReminderTime);
  const [followUp, setFollowUp] = useState(Boolean(existing?.reminder.followUpTime));
  const [followUpTime, setFollowUpTime] = useState(existing?.reminder.followUpTime ?? '20:00');
  const [startDate, setStartDate] = useState(existing?.startDate ?? today);
  // Colour and icon are no longer chosen in the app; the stored values are kept for compatibility.
  const color = existing?.color ?? COLORS[0];
  const icon = existing?.icon ?? ICONS[0];
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [askPermission, setAskPermission] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (id && !existing) navigate('/', { replace: true });
  }, [id, existing, navigate]);

  const order = Array.from({ length: 7 }, (_, i) => (i + settings.weekStartsOn) % 7);

  function build(): ActivityInput | null {
    const e: Record<string, string> = {};
    const trimmed = name.trim();
    if (!trimmed) e.name = 'Give the activity a name.';
    if (freqType === 'weekdays' && days.length === 0) e.days = 'Choose at least one day.';
    if (remind && followUp && followUpTime <= time) e.followUp = 'Set the second reminder later than the first.';
    setErrors(e);
    if (e.days || e.followUp) setMore(true);
    if (Object.keys(e).length) return null;
    const frequency: Frequency =
      freqType === 'daily' ? { type: 'daily' } : freqType === 'weekdays' ? { type: 'weekdays', days: [...days].sort() } : { type: 'timesPerWeek', count };
    return {
      name: trimmed,
      details: details.trim() || undefined,
      // Targets are no longer set here; one saved by an older version is kept as it is.
      targetQuantity: existing?.targetQuantity,
      unit: existing?.unit,
      frequency,
      reminder: { enabled: remind, time, followUpTime: remind && followUp ? followUpTime : undefined },
      startDate,
      category: existing?.category,
      color,
      icon,
    };
  }

  async function save(input: ActivityInput) {
    setSaving(true);
    try {
      if (existing) await repo.updateActivity(existing.id, input);
      else await repo.createActivity(input);
      navigate(-1);
    } catch {
      setErrors({ form: 'Could not save. Check the fields and try again.' });
      setSaving(false);
    }
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const input = build();
    if (!input) {
      document.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ block: 'center' });
      return;
    }
    // Ask for notification permission in context: only when a reminder is actually being turned on.
    if (input.reminder.enabled && (await reminderPermission()) === 'prompt') {
      setAskPermission(true);
      return;
    }
    await save(input);
  }

  async function answerPermission(allow: boolean) {
    setAskPermission(false);
    if (allow) await requestReminderPermission();
    const input = build();
    if (input) await save(input);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <PageHeader title={existing ? 'Edit activity' : 'New activity'} back />
      <div className="flex flex-col gap-4 px-5">
        <Field label="Name" error={errors.name}>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Read a book" autoFocus={!existing} aria-invalid={Boolean(errors.name)} />
        </Field>

        <div>
          <button type="button" aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)} className="-mt-3 min-h-12 text-sm font-semibold text-accent">
            {notesOpen ? 'Hide notes' : details.trim() ? 'Edit notes' : 'Add notes'}
          </button>
          {notesOpen && (
            <textarea className="field" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} placeholder="For example: 10 pages before bed" aria-label="Notes" autoFocus />
          )}
        </div>

        <div className="flex min-h-12 items-center gap-3">
          <label htmlFor="reminder-time" className="flex-1 font-semibold">Reminder</label>
          {remind && <input id="reminder-time" type="time" className="field !w-36" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} />}
          <Switch checked={remind} onChange={setRemind} label="Reminder" />
        </div>

        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="-my-2 min-h-12 self-start text-sm font-semibold text-accent">
          {more ? 'Fewer options' : 'More options'}
        </button>

        {more && (
          <>
            <fieldset>
              <legend className="mb-1 font-semibold">How often</legend>
              <Segmented
                label="How often"
                value={freqType}
                onChange={setFreqType}
                options={[
                  { value: 'daily', label: 'Every day' },
                  { value: 'weekdays', label: 'Some days' },
                  { value: 'timesPerWeek', label: 'Per week' },
                ]}
              />
              {freqType === 'weekdays' && (
                <div className="mt-3 flex justify-between gap-1">
                  {order.map((d) => {
                    const on = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        aria-label={DAY_NAMES[d]}
                        onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                        className={`h-12 w-12 rounded-full text-sm font-semibold ${on ? 'bg-accent text-on-accent' : 'bg-sunk text-muted'}`}
                      >
                        {DAY_NAMES[d].slice(0, 2)}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.days && <p className="mt-1 text-sm font-semibold text-danger" role="alert">{errors.days}</p>}
              {freqType === 'timesPerWeek' && (
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" aria-label="Fewer times" onClick={() => setCount(Math.max(1, count - 1))} className="h-12 w-12 rounded-full bg-sunk font-bold">−</button>
                  <p className="flex-1 text-center font-semibold" aria-live="polite">{count === 1 ? 'Once a week' : `${count} times a week`}</p>
                  <button type="button" aria-label="More times" onClick={() => setCount(Math.min(7, count + 1))} className="h-12 w-12 rounded-full bg-sunk font-bold">+</button>
                </div>
              )}
            </fieldset>

            {remind && (
              <div>
                <div className="flex min-h-12 items-center gap-3">
                  <label htmlFor="follow-up-time" className="flex-1 font-semibold">Second reminder</label>
                  {followUp && <input id="follow-up-time" type="time" className="field !w-36" value={followUpTime} onChange={(e) => e.target.value && setFollowUpTime(e.target.value)} />}
                  <Switch checked={followUp} onChange={setFollowUp} label="Second reminder" />
                </div>
                {errors.followUp && <p className="mt-1 text-sm font-semibold text-danger" role="alert">{errors.followUp}</p>}
              </div>
            )}

            <div className="flex min-h-12 items-center gap-3">
              <label htmlFor="start-date" className="flex-1 font-semibold">Start date</label>
              <input id="start-date" type="date" className="field !w-44" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
            </div>
          </>
        )}

        {errors.form && <p className="font-semibold text-danger" role="alert">{errors.form}</p>}
        <Button type="submit" disabled={saving}>{existing ? 'Save changes' : 'Add activity'}</Button>
        {existing && (
          <div className="flex gap-2">
            <Button
              variant="quiet"
              className="flex-1"
              onClick={() => {
                const next = existing.status === 'active' ? 'paused' : 'active';
                void repo.setStatus(existing.id, next);
                toast({ message: next === 'paused' ? 'Paused. Your streak is safe.' : 'Resumed' });
                navigate(-1);
              }}
            >
              {existing.status === 'active' ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => setConfirmDelete(true)}>Delete</Button>
          </div>
        )}
      </div>

      {confirmDelete && existing && (
        <Dialog title={`Delete ${existing.name}?`} onClose={() => setConfirmDelete(false)}>
          <p className="text-muted">This removes the activity and its history from this device. It cannot be undone.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              className="!bg-danger !text-surface"
              onClick={() => {
                // Go home first so the pages for this activity are no longer on screen when it disappears.
                navigate('/', { replace: true });
                void repo.deleteActivity(existing.id).then(() => toast({ message: 'Deleted' }));
              }}
            >
              Delete
            </Button>
            <Button variant="quiet" onClick={() => setConfirmDelete(false)}>Keep it</Button>
          </div>
        </Dialog>
      )}

      {askPermission && (
        <Dialog title="Allow reminders?" onClose={() => setAskPermission(false)}>
          <p className="text-muted">You get a notification at the reminder time, only if this activity is still not done.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => void answerPermission(true)}>Allow reminders</Button>
            <Button variant="quiet" onClick={() => void answerPermission(false)}>Not now</Button>
          </div>
        </Dialog>
      )}
    </form>
  );
}
