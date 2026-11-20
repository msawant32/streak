import { useData } from './data';

/** "Read 10 pages" -> "R••••". Only the first character stays visible; the length is not revealed. */
export function maskName(name: string): string {
  const first = Array.from(name.trim())[0] ?? '';
  return `${first}••••`;
}

/** Returns how activity names should be shown right now, honouring the hide setting. */
export function useNames(): { hidden: boolean; show: (name: string) => string } {
  const { settings } = useData();
  const hidden = settings.hideNames === true;
  return { hidden, show: (name) => (hidden ? maskName(name) : name) };
}
