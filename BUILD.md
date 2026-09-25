# Build and release

## Prerequisites

- Node.js 22 and npm
- JDK 21
- Android SDK 36 and Build Tools 36.0.0

## Web

```bash
npm install
npm run lint
npm test
npm run build
```

Commit the generated `package-lock.json`, then use `npm ci` in subsequent builds.

## Android

```bash
npm run build
npm run prepare:native
npx cap sync android
chmod +x android/gradlew
cd android
./gradlew assembleDebug
```

Release builds require `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD`.

## Deep links

Examples:

```text
hooshyar://open?tab=calendar&year=1405&month=7&day=1
hooshyar://open?tab=tasks
/?tab=reminders
```

## Notification limitation

Android uses native alarms and continues while the app is closed. Browser/PWA timers cannot reliably wake a closed browser tab without a push backend, so the UI explicitly labels browser notifications as reliable only while the page is active.
