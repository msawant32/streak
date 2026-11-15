import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db } from '../data/db';
import { repo } from '../data/repo';
import { todayISO } from '../domain/dates';
import type { Activity, CheckIn, ISODate, Settings } from '../domain/types';

export interface AppData {
  activities: Activity[];
  /** activity id → (date → check-in) */
  maps: Map<string, Map<ISODate, CheckIn>>;
  settings: Settings;
  today: ISODate;
}

const Ctx = createContext<AppData | null>(null);
const EMPTY: Map<ISODate, CheckIn> = new Map();

/** Today's date, kept current across midnight and when the app returns to the foreground. */
function useToday(): ISODate {
  const [today, setToday] = useState(() => todayISO());
  useEffect(() => {
    const check = () => setToday(todayISO());
    const timer = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const activities = useLiveQuery(() => db.activities.orderBy('id').toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []);
  const settings = useLiveQuery(() => repo.getSettings(), []);
  const today = useToday();

  const value = useMemo<AppData | null>(() => {
    if (!activities || !checkIns || !settings) return null;
    const maps = new Map<string, Map<ISODate, CheckIn>>();
    for (const c of checkIns) {
      let m = maps.get(c.activityId);
      if (!m) maps.set(c.activityId, (m = new Map()));
      m.set(c.date, c);
    }
    const sorted = [...activities].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { activities: sorted, maps, settings, today };
  }, [activities, checkIns, settings, today]);

  if (!value) return <div className="grid h-full place-items-center text-muted" role="status">Loading…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}

export function useCheckIns(activityId: string): Map<ISODate, CheckIn> {
  return useData().maps.get(activityId) ?? EMPTY;
}
