import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { toCSV } from './backup';
import { StreakDB } from './db';
import { createRepo, type ActivityInput } from './repo';

const input: ActivityInput = {
  name: 'Read a book',
  targetQuantity: 10,
  unit: 'pages',
  frequency: { type: 'daily' },
  reminder: { enabled: true, time: '08:00' },
  startDate: '2026-01-01',
  color: '#1F6F5C',
  icon: '📖',
};

let n = 0;
let repo: ReturnType<typeof createRepo>;
beforeEach(() => {
  repo = createRepo(new StreakDB(`test-${n++}`));
});

describe('repository', () => {
  it('defaults the reminder time to 08:00', async () => {
    expect((await repo.getSettings()).defaultReminderTime).toBe('08:00');
  });

  it('rejects an activity without a name', async () => {
    await expect(repo.createActivity({ ...input, name: '  ' })).rejects.toThrow();
  });

  it('completes the day only when the target is reached', async () => {
    const a = await repo.createActivity(input);
    await repo.logQuantity(a, '2026-01-01', 6);
    expect((await repo.getCheckIn(a.id, '2026-01-01'))?.completed).toBe(false);
    await repo.logQuantity(a, '2026-01-01', 10);
    expect((await repo.getCheckIn(a.id, '2026-01-01'))?.completed).toBe(true);
  });

  it('undo restores the previous state', async () => {
    const a = await repo.createActivity(input);
    await repo.logQuantity(a, '2026-01-01', 4);
    const before = await repo.getCheckIn(a.id, '2026-01-01');
    await repo.markDone(a, '2026-01-01');
    await repo.restoreCheckIn(a.id, '2026-01-01', before);
    expect(await repo.getCheckIn(a.id, '2026-01-01')).toMatchObject({ quantity: 4, completed: false });
  });

  it('records paused days when pausing and resuming', async () => {
    const a = await repo.createActivity(input);
    await repo.setStatus(a.id, 'paused', '2026-01-05');
    await repo.setStatus(a.id, 'active', '2026-01-08');
    const backup = await repo.exportBackup();
    expect(backup.activities[0].pausedRanges).toEqual([{ from: '2026-01-05', to: '2026-01-07' }]);
  });

  it('exports and imports a backup, and rejects other files', async () => {
    const a = await repo.createActivity(input);
    await repo.markDone(a, '2026-01-01');
    const backup = await repo.exportBackup();
    expect(toCSV(backup)).toContain('"2026-01-01","Read a book","yes","10","pages",""');

    const other = createRepo(new StreakDB(`test-${n++}`));
    expect(await other.importBackup(JSON.stringify(backup))).toEqual({ activities: 1, checkIns: 1 });
    expect((await other.getCheckIn(a.id, '2026-01-01'))?.completed).toBe(true);
    await expect(other.importBackup('{"hello":1}')).rejects.toThrow('not a Streak backup');
    await expect(other.importBackup('nope')).rejects.toThrow('not valid JSON');
  });

  it('deleting an activity removes its check-ins', async () => {
    const a = await repo.createActivity(input);
    await repo.markDone(a, '2026-01-01');
    await repo.deleteActivity(a.id);
    expect((await repo.exportBackup()).checkIns).toHaveLength(0);
  });
});
