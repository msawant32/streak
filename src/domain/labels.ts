import type { Activity, Frequency } from './types';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function frequencyLabel(f: Frequency): string {
  if (f.type === 'daily') return 'Every day';
  if (f.type === 'timesPerWeek') return f.count === 1 ? 'Once a week' : `${f.count} times a week`;
  return [...f.days].sort().map((d) => DAY[d]).join(', ');
}

export function targetLabel(a: Activity): string {
  return a.targetQuantity ? `${a.targetQuantity} ${a.unit ?? 'times'}` : '';
}

/** "No streak yet", "1-day streak", "3-week streak" */
export function streakLabel(count: number, unit: 'day' | 'week'): string {
  return count === 0 ? 'No streak yet' : `${count}-${unit} streak`;
}
