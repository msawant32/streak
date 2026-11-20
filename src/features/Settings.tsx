import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { BACKUP_EVERY_DAYS, backupNow, eraseAll, KEEP_ERASED_DAYS, restoreErased } from '../app/backups';
import { useData } from '../app/data';
import { Button, Dialog, PageHeader, Segmented, useToast } from '../components/ui';
import { db } from '../data/db';
import { repo } from '../data/repo';
import { formatDateTime } from '../domain/dates';
import { isNative, reminderPermission, requestReminderPermission, type PermissionState } from '../platform/reminders';

const ROW = 'flex min-h-14 items-center justify-between gap-3 py-1.5';

function TimeRow({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={ROW}>
      <label htmlFor={id} className="font-semibold">{label}</label>
      <input id={id} type="time" className="field !min-h-11 !w-[7.25rem] !px-2" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </div>
  );
}

export function SettingsPage() {
  const { settings } = useData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const backup = useLiveQuery(() => db.meta.get('autoBackup'), []);
  const erased = useLiveQuery(() => db.meta.get('erased'), []);
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [eraseStep, setEraseStep] = useState<0 | 1 | 2>(0);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void reminderPermission().then(setPermission);
  }, []);

  async function runBackup() {
    setBusy(true);
    try {
      const row = await backupNow({ download: true });
      toast({ message: `Backed up to ${row.where}` });
    } catch {
      toast({ message: 'Could not save the backup. Try again.' });
    } finally {
      setBusy(false);
    }
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
      <PageHeader brand title="Settings" />

      <div className="px-5">
        <div className="card divide-y divide-line px-4">
          <div className="py-1">
            <TimeRow id="default-1" label="Reminder 1" value={settings.defaultReminderTime} onChange={(v) => void repo.saveSettings({ defaultReminderTime: v })} />
            <TimeRow id="default-2" label="Reminder 2" value={settings.defaultSecondReminderTime ?? '20:00'} onChange={(v) => void repo.saveSettings({ defaultSecondReminderTime: v })} />
            <p className="pb-1 text-sm text-muted">Used for new activities.</p>
          </div>

          <div className={ROW}>
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

          <div className="py-2.5">
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

          <div className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Backup</p>
              <p className="text-sm text-muted">Every {BACKUP_EVERY_DAYS} days</p>
            </div>
            <p className="text-sm text-muted">{backup ? `Last: ${formatDateTime(backup.at)}` : 'No backup yet'}</p>
            {backup && <p className="break-all text-sm text-muted">{backup.where}</p>}
            <div className="mt-2 flex gap-2">
              <Button variant="quiet" className="flex-1" disabled={busy} onClick={() => void runBackup()}>Back up now</Button>
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

          {erased?.expiresAt && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-semibold">Erased data</p>
                <p className="text-sm text-muted">Kept until {formatDateTime(erased.expiresAt)}</p>
                <p className="break-all text-sm text-muted">{erased.where}</p>
              </div>
              <Button variant="quiet" onClick={() => setConfirmRestore(true)}>Restore</Button>
            </div>
          )}

          <Button variant="danger" className="w-full" onClick={() => setEraseStep(1)}>Erase all data</Button>
        </div>
        <p className="pt-2 text-sm text-muted">Streak 1.5.0. No account, no ads, no tracking.</p>
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

      {confirmRestore && (
        <Dialog title="Restore erased data?" onClose={() => setConfirmRestore(false)}>
          <p className="text-muted">This replaces what is in Streak now with the data erased on {erased ? formatDateTime(erased.at) : ''}.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              onClick={() => {
                setConfirmRestore(false);
                void restoreErased().then(() => toast({ message: 'Erased data restored' }));
              }}
            >
              Restore
            </Button>
            <Button variant="quiet" onClick={() => setConfirmRestore(false)}>Cancel</Button>
          </div>
        </Dialog>
      )}

      {eraseStep > 0 && (
        <Dialog key={eraseStep} title={eraseStep === 1 ? 'Erase all data?' : 'Are you sure?'} onClose={() => setEraseStep(0)}>
          <p className="text-muted">
            {eraseStep === 1
              ? `All activities, history and settings are removed. A copy is kept for ${KEEP_ERASED_DAYS} days so you can restore it, then it is deleted.`
              : 'Please confirm once more. Your activities disappear from the app now.'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              className={eraseStep === 2 ? '!bg-danger !text-surface' : ''}
              variant={eraseStep === 1 ? 'danger' : 'primary'}
              onClick={() => {
                if (eraseStep === 1) return setEraseStep(2);
                setEraseStep(0);
                void eraseAll();
              }}
            >
              {eraseStep === 1 ? 'Continue' : 'Yes, erase all data'}
            </Button>
            <Button variant="quiet" onClick={() => setEraseStep(0)}>Keep my data</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
