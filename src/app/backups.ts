import { repo } from '../data/repo';
import type { MetaRow } from '../data/db';
import { deleteAppFile, writeAppFile } from '../platform/files';
import { downloadFile } from '../platform/native';
import { isNative } from '../platform/reminders';

const DAY_MS = 24 * 60 * 60 * 1000;
export const BACKUP_EVERY_DAYS = 2;
export const KEEP_ERASED_DAYS = 2;
export const BACKUP_FILE = 'streak-backup.json';
export const ERASED_FILE = 'streak-erased.json';
const IN_BROWSER = 'This browser';

/** True when no backup exists yet or the last one is at least `days` old. */
export function isBackupDue(lastAt: string | undefined, now: Date, days = BACKUP_EVERY_DAYS): boolean {
  return !lastAt || now.getTime() - new Date(lastAt).getTime() >= days * DAY_MS;
}

export function isExpired(row: MetaRow | undefined, now: Date): boolean {
  return Boolean(row?.expiresAt && new Date(row.expiresAt).getTime() <= now.getTime());
}

/**
 * Writes the backup file, replacing the previous one.
 * Android: Documents/Streak/streak-backup.json. Browser: kept in the browser; `download` also saves a file.
 */
export async function backupNow({ download = false } = {}): Promise<MetaRow> {
  const data = await repo.exportBackup();
  const json = JSON.stringify(data, null, 2);
  let where = await writeAppFile(BACKUP_FILE, json);
  if (!where && download) {
    downloadFile(BACKUP_FILE, json, 'application/json');
    where = `Downloads/${BACKUP_FILE}`;
  }
  const row: MetaRow = { key: 'autoBackup', at: new Date().toISOString(), where: where ?? IN_BROWSER, data: isNative ? undefined : data };
  await repo.putMeta(row);
  return row;
}

let running: Promise<void> | null = null;

/** Runs on launch and whenever the app comes back: backs up every 2 days and purges erased data after 2 days. */
export function runHousekeeping(now = new Date()): Promise<void> {
  running ??= (async () => {
    try {
      const erased = await repo.getMeta('erased');
      if (isExpired(erased, now)) {
        await deleteAppFile(ERASED_FILE);
        await repo.deleteMeta('erased');
      }
      const last = await repo.getMeta('autoBackup');
      // Never replace a good backup with an empty one.
      if (isBackupDue(last?.at, now) && (await repo.hasActivities())) await backupNow();
    } catch (err) {
      console.warn('Backup housekeeping failed', err);
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Erases everything, keeping one copy for 2 days so it can be restored. The automatic backup is removed too,
 * so after 2 days nothing of the erased data is left on the device.
 */
export async function eraseAll(): Promise<MetaRow | undefined> {
  const kept = await repo.getMeta('erased');
  // Erasing an already empty app must not overwrite the copy that is still being kept.
  if (kept && !(await repo.hasActivities())) {
    await repo.resetAll();
    return kept;
  }
  const data = await repo.exportBackup();
  const at = new Date();
  const where = await writeAppFile(ERASED_FILE, JSON.stringify(data, null, 2));
  const row: MetaRow = {
    key: 'erased',
    at: at.toISOString(),
    expiresAt: new Date(at.getTime() + KEEP_ERASED_DAYS * DAY_MS).toISOString(),
    where: where ?? IN_BROWSER,
    data,
  };
  await repo.putMeta(row);
  await deleteAppFile(BACKUP_FILE);
  await repo.deleteMeta('autoBackup');
  await repo.resetAll();
  return row;
}

/** Puts erased data back, replacing whatever is in the app now. */
export async function restoreErased(): Promise<void> {
  const row = await repo.getMeta('erased');
  if (!row?.data) throw new Error('There is no erased data to restore.');
  await repo.importBackup(JSON.stringify(row.data));
  await deleteAppFile(ERASED_FILE);
  await repo.deleteMeta('erased');
}
