import 'fake-indexeddb/auto';
import { maskName } from './privacy';
import { describe, expect, it } from 'vitest';
import { isBackupDue, isExpired } from './backups';

describe('backup schedule', () => {
  const now = new Date('2026-11-19T10:00:00');
  it('is due when there is no backup yet', () => expect(isBackupDue(undefined, now)).toBe(true));
  it('is not due within 2 days', () => expect(isBackupDue('2026-11-17T10:00:01', now)).toBe(false));
  it('is due after 2 days', () => expect(isBackupDue('2026-11-17T10:00:00', now)).toBe(true));
  it('purges erased data only after it expires', () => {
    const row = { key: 'erased' as const, at: '', where: '', expiresAt: '2026-11-19T10:00:00' };
    expect(isExpired(row, new Date('2026-11-19T09:59:59'))).toBe(false);
    expect(isExpired(row, now)).toBe(true);
    expect(isExpired(undefined, now)).toBe(false);
  });
});


describe('hide names', () => {
  it('keeps only the first character and hides the length', () => {
    expect(maskName('Read 10 pages')).toBe('R••••');
    expect(maskName('  walk')).toBe('w••••');
    expect(maskName('Go')).toBe('G••••');
  });
});
