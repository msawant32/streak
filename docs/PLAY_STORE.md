# Publishing Streak on Google Play

Google changes these rules from time to time. Treat this as a checklist and confirm each item in the Play Console as you go.

## 1. Developer account

- Register at the [Google Play Console](https://play.google.com/console) (one-time fee, identity verification required).
- New personal accounts must run a closed test with a minimum number of testers for a set period before they can apply for production access. The Play Console shows the current numbers on your dashboard.

## 2. Create the app

- App name: Streak (the name must be available; add a subtitle such as "Streak: habit tracker" if needed)
- Default language, app (not game), free

## 3. Store listing

- Short description (80 characters max), for example: "Mark daily activities done, keep your streaks, get reminded if you forget."
- Full description (4,000 characters max): what it does, that data stays on the device, that there are no ads.
- App icon: 512×512 PNG
- Feature graphic: 1024×500 PNG or JPG
- Phone screenshots: at least 2 (Today, activity detail with calendar, Insights, reminder notification are good choices)

## 4. App content declarations

| Form | Answer for this version |
|---|---|
| Privacy policy | Required. Host the text below at a public URL and paste the link |
| Data safety | No data collected, no data shared. Everything is stored on the device |
| Ads | No ads |
| App access | All features available without login |
| Content rating | Fill in the questionnaire; this app has no sensitive content |
| Target audience | Choose the age groups you intend; avoid children's categories unless you want the extra requirements |

If you later add accounts, cloud sync or analytics, update the Data safety form and the privacy policy before releasing.

## 5. Release

1. Build the signed `.aab` (see [ANDROID_BUILD.md](ANDROID_BUILD.md)).
2. Enrol in Play App Signing when prompted.
3. Upload to **Internal testing** first and install it on your own phone from the Play Store.
4. Move to **Closed testing**, meet the tester requirement, then apply for **Production**.
5. Every new upload needs a higher `versionCode`.

## Privacy policy template

> **Streak privacy policy**
> Last updated: [date]
>
> Streak is a personal activity tracker published by [your name] ("we").
>
> **What we collect:** Nothing. Streak has no account, no server, no advertising and no analytics. The activities, check-ins, notes and settings you enter are stored only on your device.
>
> **Notifications:** If you allow notifications, Streak schedules reminders on your device. No information is sent anywhere to do this.
>
> **Backups:** If you export a backup, the file is saved where you choose and is under your control. If device backup is turned on in your phone's settings, your phone's maker or Google may include app data in that backup under their own policies.
>
> **Deleting your data:** Use Settings > Erase all data, or uninstall the app.
>
> **Children:** Streak is not directed at children under 13.
>
> **Contact:** [your email address]

Have the final text reviewed if you are unsure whether it meets the rules where you live.
