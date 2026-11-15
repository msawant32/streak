import { useEffect, useRef, useState } from 'react';
import { useData } from '../app/data';
import { Button, Dialog, PageHeader, Segmented, useToast } from '../components/ui';
import { repo } from '../data/repo';
import { downloadFile } from '../platform/native';
import { isNative, reminderPermission, requestReminderPermission, type PermissionState } from '../platform/reminders';

export function SettingsPage() {
  const { settings, today } = useData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [pendingImport, setPendingImport] = useState<string | null>(null);

  useEffect(() => {
    void reminderPermission().then(setPermission);
  }, []);

  async function exportData() {
    const backup = await repo.exportBackup();
    downloadFile(`streak-backup-${today}.json`, JSON.stringify(backup, null, 2), 'application/json');
    toast({ message: 'Backup saved' });
  }

  async function runImport(text: string) {
    setPendingImport(null);
    try {
      const r = await repo.importBackup(text);
      toast({ message: `Imported ${r.activities} activities and ${r.checkIns} check-ins` });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not import this file.' });
    }
  }

  return (
    <>
      <PageHeader title="Settings" />

      <div className="px-5">
        <div className="card divide-y divide-line px-4">
          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            <label htmlFor="default-time" className="font-semibold">Reminder time</label>
            <input
              id="default-time"
              type="time"
              className="field !w-36"
              value={settings.defaultReminderTime}
              onChange={(e) => e.target.value && void repo.saveSettings({ defaultReminderTime: e.target.value })}
            />
          </div>

          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-sm text-muted">
                {permission === 'granted' && (isNative ? 'Allowed' : 'Allowed while Streak is open')}
                {permission === 'prompt' && 'Needed for reminders'}
                {permission === 'denied' && `Blocked in your ${isNative ? 'phone' : 'browser'} settings`}
                {permission === 'unsupported' && 'Not available in this browser'}
              </p>
            </div>
            {permission === 'prompt' && <Button onClick={() => void requestReminderPermission().then(setPermission)}>Allow</Button>}
          </div>

          <div className="py-3">
            <Segmented
              label="Theme"
              value={settings.theme}
              onChange={(theme) => void repo.saveSettings({ theme })}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>

          <div className="py-3">
            <p className="font-semibold">Backup</p>
            <p className="text-sm text-muted">Your data is stored only on this device.</p>
            <div className="mt-2 flex gap-2">
              <Button variant="quiet" className="flex-1" onClick={() => void exportData()}>Save</Button>
              <Button variant="quiet" className="flex-1" onClick={() => fileRef.current?.click()}>Import</Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Backup file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void file.text().then(setPendingImport);
              }}
            />
          </div>

          <Button variant="danger" className="w-full" onClick={() => setResetStep(1)}>Erase all data</Button>
        </div>
        <p className="pt-3 text-sm text-muted">Streak 1.3.1. No account, no ads, no tracking.</p>
      </div>

      {pendingImport !== null && (
        <Dialog title="Replace everything with this backup?" onClose={() => setPendingImport(null)}>
          <p className="text-muted">Importing replaces all activities and history on this device with the contents of the file.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => void runImport(pendingImport)}>Import backup</Button>
            <Button variant="quiet" onClick={() => setPendingImport(null)}>Cancel</Button>
          </div>
        </Dialog>
      )}
      {resetStep > 0 && (
        <Dialog key={resetStep} title={resetStep === 1 ? 'Erase all data?' : 'Are you sure?'} onClose={() => setResetStep(0)}>
          <p className="text-muted">
            {resetStep === 1
              ? 'This deletes every activity, check-in and setting on this device.'
              : 'This cannot be undone. Without a backup, your streaks are gone for good.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              variant="danger"
              onClick={() => {
                if (resetStep === 1) return setResetStep(2);
                setResetStep(0);
                void repo.resetAll();
              }}
            >
              {resetStep === 1 ? 'Continue' : 'Erase all data'}
            </Button>
            <Button variant="quiet" onClick={() => setResetStep(0)}>Keep my data</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
