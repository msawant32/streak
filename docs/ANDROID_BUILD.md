# Building the Android app

The `android/` folder is a normal Android Studio (Gradle) project. Capacitor copies the built web app into it.

## One-time setup

1. Install [Android Studio](https://developer.android.com/studio). It includes the Android SDK and Java.
2. In `capacitor.config.ts`, change `appId` from `com.yourname.streak` to your own ID, for example `com.janedoe.streak`. **The ID is permanent once the app is published.**
   Make the same change in `android/app/build.gradle` (`namespace` and `applicationId`), in `android/app/src/main/res/values/strings.xml`, and move `MainActivity.java` to the matching package folder. The simplest way: delete the `android/` folder, run `npx cap add android`, then re-apply the two manifest edits described under "Manifest changes" below.

## Run on a phone or emulator

```bash
npm install
npm run android:sync     # builds the web app and copies it into android/
npm run android:open     # opens Android Studio
```

In Android Studio, pick a device (an emulator, or a phone with USB debugging turned on) and press **Run**.

Run `npm run android:sync` again after every change to the web code.

## Test reminders on the device

1. Create an activity with a reminder two minutes from now and allow notifications when asked.
2. Close the app. The notification should arrive around that time (Android may delay it by a few minutes to save battery).
3. Try **Mark done** and **Snooze 1 hour** on the notification.
4. Restart the phone and check that a later reminder still arrives.

## Build the signed bundle for Google Play

1. Create an upload key (once). Keep the file and passwords safe; back them up somewhere private.

   ```bash
   keytool -genkey -v -keystore ~/streak-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias streak
   ```

2. Create `android/keystore.properties` (it is in `.gitignore`; never commit it):

   ```properties
   storeFile=/Users/you/streak-upload.jks
   storePassword=your-store-password
   keyAlias=streak
   keyPassword=your-key-password
   ```

3. Raise `versionCode` by 1 (and update `versionName`) in `android/app/build.gradle` for every upload.

4. Build:

   ```bash
   npm run android:sync
   cd android
   ./gradlew bundleRelease
   ```

   The file to upload is `android/app/build/outputs/bundle/release/app-release.aab`.

   To install a build directly on a phone instead, run `./gradlew assembleDebug` and install `app/build/outputs/apk/debug/app-debug.apk`.

## Manifest changes made for Streak

`android/app/src/main/AndroidManifest.xml` differs from the Capacitor default in two ways:

- An intent filter so `streak://activity/{id}` links open the app.
- `SCHEDULE_EXACT_ALARM` is removed. Reminders use inexact alarms that still fire in battery-saving mode, which avoids a permission Google Play restricts.

The notification permission (`POST_NOTIFICATIONS`) and restart handling (`RECEIVE_BOOT_COMPLETED`) come from the local-notifications plugin. The app asks for notification permission only when you first turn a reminder on.

## Before the first release

- Replace the default launcher icon and splash screen: put a 1024×1024 `icon.png` and a 2732×2732 `splash.png` in an `assets/` folder, then run `npx @capacitor/assets generate --android`.
- Check `targetSdkVersion` in `android/variables.gradle` against [Google Play's current target API requirement](https://developer.android.com/google/play/requirements/target-sdk).
- `android:allowBackup` is on, so Android's own device backup can carry a user's streaks to a new phone. Turn it off in the manifest if you do not want that.
- Release minification (R8) is off. Turn on `minifyEnabled` in `android/app/build.gradle` only after testing a release build end to end.
