import { addDays, todayISO } from '../domain/dates';
import { DEFAULT_SETTINGS, type Activity, type ActivityStatus, type CheckIn, type ISODate, type Settings } from '../domain/types';
import { activitySchema, parseBackup, type Backup } from './backup';
import { db as defaultDb, type StreakDB } from './db';

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

export type ActivityInput = Omit<Activity, 'id' | 'status' | 'pausedRanges' | 'createdAt' | 'updatedAt'>;

/**
 * All reads and writes go through this repository, so the storage behind it
 * (IndexedDB today, cloud sync later) can change without touching the screens.
 */
export function createRepo(db: StreakDB = defaultDb) {
  return {
    async getSettings(): Promise<Settings> {
      const row = await db.settings.get('app');
      // Weeks always start on Sunday; the stored value from older versions is ignored.
      return { ...DEFAULT_SETTINGS, ...row, weekStartsOn: 0 };
    },

    async saveSettings(patch: Partial<Settings>): Promise<void> {
      const current = await this.getSettings();
      await db.settings.put({ ...current, ...patch, key: 'app' });
    },

    async createActivity(input: ActivityInput): Promise<Activity> {
      const activity = activitySchema.parse({
        ...input,
        id: uuid(),
        status: 'active',
        pausedRanges: [],
        createdAt: now(),
        updatedAt: now(),
      }) as Activity;
      await db.activities.add(activity);
      return activity;
    },

    async updateActivity(id: string, input: Partial<ActivityInput>): Promise<void> {
      const existing = await db.activities.get(id);
      if (!existing) throw new Error('Activity not found');
      const next = activitySchema.parse({ ...existing, ...input, updatedAt: now() }) as Activity;
      await db.activities.put(next);
    },

    /** Pausing records the paused days so they never count as missed. */
    async setStatus(id: string, status: ActivityStatus, today: ISODate = todayISO()): Promise<void> {
      const a = await db.activities.get(id);
      if (!a || a.status === status) return;
      let ranges = a.pausedRanges.map((r) => ({ ...r }));
      const open = ranges.find((r) => r.to === undefined);
      if (status === 'active' && open) {
        open.to = addDays(today, -1);
        ranges = ranges.filter((r) => r.to === undefined || r.to >= r.from);
      } else if (status !== 'active' && !open) {
        ranges.push({ from: today });
      }
      await db.activities.put({ ...a, status, pausedRanges: ranges, updatedAt: now() });
    },

    /** Excuses one missed day so the streak carries on. `on: false` takes it back. */
    async setSkippedDay(id: string, date: ISODate, on: boolean): Promise<void> {
      const a = await db.activities.get(id);
      if (!a) return;
      const days = new Set(a.skippedDays ?? []);
      if (on) days.add(date);
      else days.delete(date);
      await db.activities.put({ ...a, skippedDays: [...days].sort(), updatedAt: now() });
    },

    async deleteActivity(id: string): Promise<void> {
      await db.transaction('rw', db.activities, db.checkIns, async () => {
        await db.checkIns.where('activityId').equals(id).delete();
        await db.activities.delete(id);
      });
    },

    async getCheckIn(activityId: string, date: ISODate): Promise<CheckIn | undefined> {
      return db.checkIns.where('[activityId+date]').equals([activityId, date]).first();
    },

    /** Creates or updates the check-in for one activity on one day. */
    async saveCheckIn(activityId: string, date: ISODate, patch: Partial<Pick<CheckIn, 'quantity' | 'completed' | 'note'>>) {
      await db.transaction('rw', db.checkIns, async () => {
        const existing = await this.getCheckIn(activityId, date);
        const base: CheckIn = existing ?? { id: uuid(), activityId, date, completed: false, createdAt: now(), updatedAt: now() };
        await db.checkIns.put({ ...base, ...patch, updatedAt: now() });
      });
    },

    async markDone(a: Activity, date: ISODate): Promise<void> {
      await this.saveCheckIn(a.id, date, { completed: true, quantity: a.targetQuantity });
    },

    /** Logs progress toward the target. The day completes once the target is reached. */
    async logQuantity(a: Activity, date: ISODate, quantity: number): Promise<void> {
      const q = Math.max(0, quantity);
      const completed = a.targetQuantity ? q >= a.targetQuantity : q > 0;
      await this.saveCheckIn(a.id, date, { quantity: q, completed });
    },

    /** Puts a day back exactly as it was. Used by Undo. */
    async restoreCheckIn(activityId: string, date: ISODate, previous: CheckIn | undefined): Promise<void> {
      await db.transaction('rw', db.checkIns, async () => {
        await db.checkIns.where('[activityId+date]').equals([activityId, date]).delete();
        if (previous) await db.checkIns.put(previous);
      });
    },

    async exportBackup(): Promise<Backup> {
      const [settings, activities, checkIns] = await Promise.all([
        this.getSettings(),
        db.activities.toArray(),
        db.checkIns.toArray(),
      ]);
      return { app: 'streak', version: 1, exportedAt: now(), settings, activities, checkIns };
    },

    /** Replaces everything on the device with the contents of a backup file. */
    async importBackup(text: string): Promise<{ activities: number; checkIns: number }> {
      const backup = parseBackup(text);
      await db.transaction('rw', db.activities, db.checkIns, db.settings, async () => {
        await Promise.all([db.activities.clear(), db.checkIns.clear()]);
        await db.activities.bulkPut(backup.activities as Activity[]);
        await db.checkIns.bulkPut(backup.checkIns as CheckIn[]);
        await db.settings.put({ ...backup.settings, onboardingComplete: true, key: 'app' });
      });
      return { activities: backup.activities.length, checkIns: backup.checkIns.length };
    },

    async resetAll(): Promise<void> {
      await db.transaction('rw', db.activities, db.checkIns, db.settings, async () => {
        await Promise.all([db.activities.clear(), db.checkIns.clear(), db.settings.clear()]);
      });
    },
  };
}

export const repo = createRepo();
