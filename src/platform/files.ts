import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { isNative } from './reminders';

const FOLDER = 'Streak';

/**
 * Where Streak keeps its files on Android, best first. Documents is visible in the Files app and survives
 * an uninstall; it needs no permission on Android 13+. Older phones fall back to the app's own folders.
 */
async function places(): Promise<{ directory: Directory; label: string }[]> {
  const id = await App.getInfo().then((i) => i.id).catch(() => 'the app');
  return [
    { directory: Directory.Documents, label: `Documents/${FOLDER}` },
    { directory: Directory.External, label: `Android/data/${id}/files/${FOLDER}` },
    { directory: Directory.Data, label: 'Streak’s private storage' },
  ];
}

/** Writes (or overwrites) a text file. Returns where it went, in words the user can follow, or null in a browser. */
export async function writeAppFile(name: string, text: string): Promise<string | null> {
  if (!isNative) return null;
  for (const p of await places()) {
    try {
      await Filesystem.writeFile({ path: `${FOLDER}/${name}`, data: text, directory: p.directory, encoding: Encoding.UTF8, recursive: true });
      return `${p.label}/${name}`;
    } catch (err) {
      console.warn(`Could not write ${name} to ${p.label}`, err);
    }
  }
  return null;
}

/** Deletes a file wherever Streak may have written it. Missing files are ignored. */
export async function deleteAppFile(name: string): Promise<void> {
  if (!isNative) return;
  for (const p of await places()) {
    await Filesystem.deleteFile({ path: `${FOLDER}/${name}`, directory: p.directory }).catch(() => {});
  }
}
