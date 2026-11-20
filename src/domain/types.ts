/** Local calendar date, "YYYY-MM-DD". */
export type ISODate = string;

export type Frequency =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { type: 'timesPerWeek'; count: number };

export interface Reminder {
  /** Whether reminder 1 is on. */
  enabled: boolean;
  /** Reminder 1, "HH:mm", device local time */
  time: string;
  /** Reminder 2, "HH:mm". Absent when reminder 2 is off. */
  followUpTime?: string;
}

export type ActivityStatus = 'active' | 'paused' | 'archived';

export interface Activity {
  id: string;
  name: string;
  details?: string;
  targetQuantity?: number;
  unit?: string;
  frequency: Frequency;
  reminder: Reminder;
  startDate: ISODate;
  category?: string;
  color: string;
  icon: string;
  status: ActivityStatus;
  pausedRanges: { from: ISODate; to?: ISODate }[];
  /** Single missed days the user chose to excuse so the streak carries on (at most 2 a month). */
  skippedDays?: ISODate[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  activityId: string;
  date: ISODate;
  quantity?: number;
  completed: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  defaultReminderTime: string;
  /** Reminder 2 for new activities. Optional so older backups still import. */
  defaultSecondReminderTime?: string;
  theme: 'system' | 'light' | 'dark';
  weekStartsOn: 0 | 1;
  allowBackfillYesterday: boolean;
  onboardingComplete: boolean;
  /** Privacy: show only the first letter of activity names everywhere, including notifications. */
  hideNames?: boolean;
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultReminderTime: '08:00',
  defaultSecondReminderTime: '20:00',
  theme: 'system',
  weekStartsOn: 0,
  allowBackfillYesterday: true,
  onboardingComplete: false,
  schemaVersion: 1,
};

export const UNITS = ['pages', 'minutes', 'reps', 'km', 'glasses', 'times'] as const;
export const COLORS = ['#1F6F5C', '#C2553F', '#3D5FA8', '#8A5BA6', '#B7791F', '#2E7D9A', '#5E7A2F', '#A8456E'] as const;
export const ICONS = ['📖', '🏃', '🧘', '💧', '✍️', '🎸', '🥗', '😴', '🧹', '💊', '🧠', '🌱'] as const;
