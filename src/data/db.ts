import Dexie, { type Table } from 'dexie';
import type { Activity, CheckIn, Settings } from '../domain/types';
import type { Backup } from './backup';

export interface SettingsRow extends Settings {
  key: 'app';
}

/** Bookkeeping that survives "Erase all data". */
export interface MetaRow {
  key: 'autoBackup' | 'erased';
  /** When it was written, ISO datetime. */
  at: string;
  /** Where the copy is, in words the user can follow, e.g. "Documents/Streak/streak-backup.json". */
  where: string;
  /** Erased data is purged after this time. */
  expiresAt?: string;
  /** The data itself, kept here so it can be restored without file access. */
  data?: Backup;
}

/** Local, on-device database. Nothing leaves the device. */
export class StreakDB extends Dexie {
  activities!: Table<Activity, string>;
  checkIns!: Table<CheckIn, string>;
  settings!: Table<SettingsRow, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'streak') {
    super(name);
    // Add a new .version(n) block with an .upgrade() step whenever the shape changes.
    this.version(1).stores({
      activities: 'id, status',
      checkIns: 'id, &[activityId+date], activityId, date',
      settings: 'key',
    });
    this.version(2).stores({ meta: 'key' });
  }
}

export const db = new StreakDB();
