import { Switch } from './ui';

/** One reminder on one line: label, time, on/off. */
export function ReminderRow({ id, label, on, time, onToggle, onTime }: { id: string; label: string; on: boolean; time: string; onToggle: (on: boolean) => void; onTime: (time: string) => void }) {
  return (
    <div className="flex min-h-12 items-center gap-2">
      <label htmlFor={id} className="flex-1 whitespace-nowrap font-semibold">{label}</label>
      {on ? (
        <input id={id} type="time" className="field !min-h-11 !w-[7.25rem] !px-2" value={time} onChange={(e) => e.target.value && onTime(e.target.value)} />
      ) : (
        <span className="text-sm text-muted">Off</span>
      )}
      <Switch checked={on} onChange={onToggle} label={label} />
    </div>
  );
}
