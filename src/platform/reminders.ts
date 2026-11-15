import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { PlannedReminder } from '../domain/streaks';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface ReminderActionHandlers {
  onMarkDone(activityId: string, date: string): void;
  onOpen(activityId: string): void;
}

const CHANNEL_ID = 'activity-reminders';
const ACTION_TYPE = 'ACTIVITY_REMINDER';
const SNOOZE_ID_BASE = 900000;
export const isNative = Capacitor.isNativePlatform();

/* ---------- Android (Capacitor local notifications) ---------- */

async function nativeInit(handlers: ReminderActionHandlers) {
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Activity reminders',
    description: 'Reminders for activities you have not completed yet',
    importance: 4,
  });
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: ACTION_TYPE,
        actions: [
          { id: 'done', title: 'Mark done' },
          { id: 'snooze', title: 'Snooze 1 hour' },
        ],
      },
    ],
  });
  await LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
    const { activityId, date } = (event.notification.extra ?? {}) as { activityId?: string; date?: string };
    if (!activityId) return;
    if (event.actionId === 'done' && date) {
      handlers.onMarkDone(activityId, date);
    } else if (event.actionId === 'snooze') {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: SNOOZE_ID_BASE + (event.notification.id % 1000),
            title: event.notification.title,
            body: event.notification.body,
            channelId: CHANNEL_ID,
            actionTypeId: ACTION_TYPE,
            extra: event.notification.extra,
            schedule: { at: new Date(Date.now() + 60 * 60 * 1000), allowWhileIdle: true },
          },
        ],
      });
    } else {
      handlers.onOpen(activityId);
    }
  });
}

async function nativeSync(plan: PlannedReminder[]) {
  const pending = await LocalNotifications.getPending();
  // Snoozed reminders are kept unless the activity no longer needs one today.
  const stillNeeded = new Set(plan.map((p) => `${p.activityId}|${p.date}`));
  const cancel = pending.notifications.filter((n) => {
    if (n.id < SNOOZE_ID_BASE) return true;
    const e = (n.extra ?? {}) as { activityId?: string; date?: string };
    return !stillNeeded.has(`${e.activityId}|${e.date}`);
  });
  if (cancel.length) await LocalNotifications.cancel({ notifications: cancel.map((n) => ({ id: n.id })) });
  if ((await LocalNotifications.checkPermissions()).display !== 'granted' || plan.length === 0) return;
  await LocalNotifications.schedule({
    notifications: plan.slice(0, 60).map((p, i) => ({
      id: i + 1,
      title: p.title,
      body: p.body,
      channelId: CHANNEL_ID,
      actionTypeId: ACTION_TYPE,
      group: 'streak-reminders',
      extra: { activityId: p.activityId, date: p.date },
      // Inexact but delivered in Doze. Avoids the restricted exact-alarm permission.
      schedule: { at: p.at, allowWhileIdle: true },
    })),
  });
}

/* ---------- Browser (works while the app is open in a tab or installed) ---------- */

let timers: number[] = [];

async function webShow(p: PlannedReminder) {
  const options: NotificationOptions = { body: p.body, tag: `${p.activityId}-${p.date}-${p.kind}`, icon: './icon.svg' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return void (await reg.showNotification(p.title, options));
    new Notification(p.title, options);
  } catch {
    /* Notifications are best-effort in the browser. */
  }
}

function webSync(plan: PlannedReminder[]) {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const horizon = Date.now() + 24 * 60 * 60 * 1000;
  for (const p of plan) {
    const at = p.at.getTime();
    if (at > horizon) continue;
    timers.push(window.setTimeout(() => void webShow(p), Math.max(0, at - Date.now())));
  }
}

/* ---------- Public API ---------- */

export async function initReminders(handlers: ReminderActionHandlers): Promise<void> {
  if (isNative) await nativeInit(handlers);
}

export async function reminderPermission(): Promise<PermissionState> {
  if (isNative) {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

export async function requestReminderPermission(): Promise<PermissionState> {
  if (isNative) {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  return result === 'default' ? 'prompt' : result;
}

/** Replaces every scheduled reminder with the given plan. */
export async function syncReminders(plan: PlannedReminder[]): Promise<void> {
  try {
    if (isNative) await nativeSync(plan);
    else webSync(plan);
  } catch (err) {
    console.warn('Could not schedule reminders', err);
  }
}
