import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './reminders';

/** Short buzz when something is marked done; a stronger one at streak milestones. */
export function buzz(kind: 'done' | 'milestone' = 'done') {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  if (isNative) {
    void (kind === 'milestone'
      ? Haptics.notification({ type: NotificationType.Success })
      : Haptics.impact({ style: ImpactStyle.Light })
    ).catch(() => {});
  } else {
    navigator.vibrate?.(kind === 'milestone' ? [30, 40, 60] : 15);
  }
}

/** Android back button and streak://activity/{id} links. */
export function initNativeNavigation(navigate: (path: string) => void) {
  if (!isNative) return;
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
  void App.addListener('appUrlOpen', ({ url }) => {
    const match = /^streak:\/\/activity\/([\w-]+)/.exec(url);
    if (match) navigate(`/activities/${match[1]}`);
  });
}

/** Saves text as a file download. */
export function downloadFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
