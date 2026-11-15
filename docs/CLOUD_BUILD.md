# Building in the cloud (nothing to install)

GitHub builds the Android app and hosts the web version for you. Android Studio is not needed.

| Recipe | File | What you get |
|---|---|---|
| Android app | `.github/workflows/android.yml` | `Streak.apk`, ready to install on a phone |
| Web preview | `.github/workflows/web.yml` | A web address that opens Streak on any device |

Both run automatically every time the code on GitHub changes, and both run the tests first.

## One-time setup

1. **Create a GitHub account** at https://github.com (free).
2. **Create a repository**: click **+** > **New repository**, name it `streak`, choose **Public**, leave every checkbox empty, click **Create repository**.
   Public keeps builds free without limit and is required for the free web preview. The code contains no passwords or personal data.
3. **Upload the project.** Use whichever is easier:

   **A. From Terminal** (if `git --version` prints a version):

   ```bash
   cd ~/Projects/streak
   git init -b main
   git add .
   git commit -m "Streak 1.3.0"
   git remote add origin https://github.com/YOUR-USERNAME/streak.git
   git push -u origin main
   ```

   GitHub asks you to sign in the first time.

   **B. From the browser** (no tools at all): on the new repository page click **uploading an existing file**. In Finder open `~/Projects/streak` and press **Cmd + Shift + .** to show hidden items. Select everything **except** `node_modules`, `dist` and `streak-source.tar.gz`, drag it into the browser, and click **Commit changes**. Make sure the `.github` folder is included; it holds the recipes.

4. **Turn on the web preview**: in the repository go to **Settings > Pages**, and under **Source** choose **GitHub Actions**.

## Get the Android app onto your phone

1. In the repository open the **Actions** tab and click the latest **Android app** run. Wait for the green tick (the first build takes the longest).
2. At the bottom of the run page, under **Artifacts**, download **Streak-android**. It is a zip containing `Streak.apk`.
3. Get `Streak.apk` onto the phone. Easiest: sign in to GitHub in the phone's browser and download it there, then unzip it in the Files app. Or send the file to yourself.
4. Tap `Streak.apk`. Android asks once to allow installing from that app (browser or Files); allow it, then tap **Install**.

Later builds install over the old one and keep your data, because every build is signed with the same test key (`android/app/debug.keystore`). That key is for testing only. A Play Store release uses your own private key; see [ANDROID_BUILD.md](ANDROID_BUILD.md).

## Open the web preview

After the **Web preview** run shows a green tick, the address is shown on that run's page and under **Settings > Pages**. It looks like `https://YOUR-USERNAME.github.io/streak/`.

In the web version, reminders arrive only while the page is open. Use the Android app for real reminders.

## Changing the code without installing anything

- **Small edits**: open a file on GitHub, click the pencil, commit. Both recipes run again.
- **Full editor in the browser**: on the repository click **Code > Codespaces > Create codespace**. In its terminal, `npm install` then `npm start` runs the app in a browser tab. Delete the codespace when you are done so it does not use your free storage.

## If a build fails

Open the failed run in the **Actions** tab, click the step with the red cross, and copy the last lines of its log. The Android project had not been compiled before the first cloud build, so a first-run fix may be needed.

## Free limits

Public repositories build for free without a minute limit. Private repositories on the free plan get a monthly allowance of build minutes; check GitHub's pricing page for the current numbers.
