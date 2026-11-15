import Dexie, { type Table } from 'dexie';
import type { Activity, CheckIn, Settings } from '../domain/types';

export interface SettingsRow extends Settings {
  key: 'app';
}

/** Local, on-device database. Nothing leaves the device. */
export class StreakDB extends Dexie {
  activities!: Table<Activity, string>;
  checkIns!: Table<CheckIn, string>;
  settings!: Table<SettingsRow, string>;

  constructor(name = 'streak') {
    super(name);
    // Add a new .version(n) block with an .upgrade() step whenever the shape changes.
    this.version(1).stores({
      activities: 'id, status',
      checkIns: 'id, &[activityId+date], activityId, date',
      settings: 'key',
    });
  }
}

export const db = new StreakDB();
