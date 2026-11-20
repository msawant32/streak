import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const frequency = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({ type: z.literal('weekdays'), days: z.array(z.number().int().min(0).max(6)).min(1) }),
  z.object({ type: z.literal('timesPerWeek'), count: z.number().int().min(1).max(7) }),
]);

export const activitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  details: z.string().max(500).optional(),
  targetQuantity: z.number().positive().max(100000).optional(),
  unit: z.string().max(20).optional(),
  frequency,
  reminder: z.object({ enabled: z.boolean(), time, followUpTime: time.optional() }),
  startDate: isoDate,
  category: z.string().max(30).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1).max(8),
  status: z.enum(['active', 'paused', 'archived']),
  pausedRanges: z.array(z.object({ from: isoDate, to: isoDate.optional() })),
  skippedDays: z.array(isoDate).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const checkInSchema = z.object({
  id: z.string().min(1),
  activityId: z.string().min(1),
  date: isoDate,
  quantity: z.number().min(0).optional(),
  completed: z.boolean(),
  note: z.string().max(280).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const settingsSchema = z.object({
  defaultReminderTime: time,
  defaultSecondReminderTime: time.optional(),
  theme: z.enum(['system', 'light', 'dark']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  allowBackfillYesterday: z.boolean(),
  onboardingComplete: z.boolean(),
  hideNames: z.boolean().optional(),
  schemaVersion: z.number().int(),
});

export const backupSchema = z.object({
  app: z.literal('streak'),
  version: z.literal(1),
  exportedAt: z.string(),
  settings: settingsSchema,
  activities: z.array(activitySchema),
  checkIns: z.array(checkInSchema),
});

export type Backup = z.infer<typeof backupSchema>;

/** Parses backup text. Throws an Error with a readable message when the file is not a valid Streak backup. */
export function parseBackup(text: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const result = backupSchema.safeParse(json);
  if (!result.success) throw new Error('This file is not a Streak backup, or it is damaged.');
  const ids = new Set(result.data.activities.map((a) => a.id));
  return { ...result.data, checkIns: result.data.checkIns.filter((c) => ids.has(c.activityId)) };
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  // Quote everything and neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** One row per check-in, readable in any spreadsheet app. */
export function toCSV(backup: Backup): string {
  const byId = new Map(backup.activities.map((a) => [a.id, a]));
  const rows = [['date', 'activity', 'completed', 'quantity', 'unit', 'note']];
  for (const c of [...backup.checkIns].sort((a, b) => a.date.localeCompare(b.date))) {
    const a = byId.get(c.activityId);
    rows.push([c.date, a?.name ?? '', c.completed ? 'yes' : 'no', String(c.quantity ?? ''), a?.unit ?? '', c.note ?? '']);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
