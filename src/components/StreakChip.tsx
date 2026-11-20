import { Flame } from './icons';

/** The brand's one warm accent: a small ember chip with the streak count. Hidden when there is no streak. */
export function StreakChip({ count, unit }: { count: number; unit: 'day' | 'week' }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ember-soft px-2 py-0.5 text-sm font-bold text-ember" aria-label={`${count}-${unit} streak`}>
      <Flame />
      {count}
      {unit === 'week' ? 'w' : ''}
    </span>
  );
}

/** Ring showing how much of today is done. */
export function ProgressRing({ done, total, size = 64 }: { done: number; total: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const share = total === 0 ? 0 : done / total;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${total} done today`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-soft)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
        />
      </svg>
      <span className="absolute text-sm font-bold">
        {done}/{total}
      </span>
    </div>
  );
}
