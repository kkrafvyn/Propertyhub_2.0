# Mobile Setup

## PWA

The web app now ships with:

- `public/manifest.webmanifest`
- `public/sw.js`
- install icons in `public/icons/`
- runtime registration in `src/lib/pwa.ts`

Build the PWA with:

```bash
npm run build:web
```

Serve the `dist/` folder over HTTPS or `localhost` to test installability.

## Android Native Wrapper

The repo now includes a Capacitor Android project in `android/`. Capacitor uses Gradle for native Android builds.

Useful commands:

```bash
npm run android:sync
npm run android:open
npm run android:gradle:debug
npm run android:build
```

The mobile shell uses these Capacitor plugins after `npx cap sync`:

- `@capacitor/app` for launch URLs and deep links
- `@capacitor/camera` for field photo capture
- `@capacitor/device` for device registration
- `@capacitor/haptics` for lightweight native feedback
- `@capacitor/keyboard` for keyboard-safe layout spacing
- `@capacitor/preferences` for the offline queue
- `@capacitor/push-notifications` for native push token registration
- `@aparajita/capacitor-biometric-auth` for Face ID, Touch ID, Android biometrics, and device credential unlock

Native push token capture is wired in the app. Production delivery still needs APNS/FCM credentials on the backend in addition to the existing web-push configuration.

The `dispatch-notification` Edge Function now accepts both browser push subscriptions and native Capacitor push tokens. Configure the relevant provider environment variables before deploying push delivery:

- `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_CONTACT_EMAIL` for browser/PWA push.
- `FCM_PROJECT_ID` and `FCM_ACCESS_TOKEN` for Firebase Cloud Messaging HTTP v1, or `FCM_SERVER_KEY` for legacy FCM delivery.
- `APNS_BEARER_TOKEN`, `APNS_BUNDLE_ID`, and optional `APNS_USE_SANDBOX=true` for Apple Push Notification service delivery.

The mobile app also includes app lock backed by Capacitor Preferences plus native device unlock. Users set a local backup code, and supported devices can unlock with Face ID, Touch ID, Android biometrics, or device PIN/password through `@aparajita/capacitor-biometric-auth`.

Offline field notes, buyer/viewing/maintenance reports, and listing photos are queued in Capacitor Preferences. The mobile account screen includes a Sync now action; notes/reports sync into the existing in-app notification log, while listing photos upload directly when the queue payload includes organization and property context.

Native release disclosure files now live in the repo:

- `ios/App/App/Info.plist` includes camera, location, photo library, and Face ID usage descriptions.
- `ios/App/App/PrivacyInfo.xcprivacy` declares the baseline app privacy manifest.
- `android/app/src/main/AndroidManifest.xml` declares camera, location, notification, media, and internet permissions.
- `docs/deployment/APP_STORE_RELEASE.md` contains App Store and Google Play disclosure inputs.
- `docs/deployment/RELEASE_HARDENING_CHECKLIST.md` is the final release gate.

The current mobile feature set also includes:

- Near-me search sorting using device geolocation and property coordinates.
- Google Maps direction links from mobile viewing cards and mappable listings.
- Calendar invite generation for property viewings through downloadable `.ics` files.
- Mobile document scanning through the Capacitor camera plugin, queued as deal documents when offline.
- Offline drafts for messages, offers, viewing requests, and maintenance reports.
- Supabase Realtime conversation listeners, message insert updates, and read-receipt refresh hooks.
- Buyer-side trust/KYC request flow for Ghana Card, tax identity, title/mandate, and address verification using existing trust verification requests.
- Notification center delivery presets for deal-critical, quiet digest, and in-app-only modes.
- Deal-room milestone checklist and buyer insights dashboard for momentum, payments, viewings, alerts, and next best actions.
- AI concierge prompts, shared buying groups, listing trust scoring, media readiness checks, neighborhood intelligence, and safe-payment milestone guidance.
- Workspace seller portal health and agent CRM action queues for hot leads, stale deal rooms, viewings, and payment follow-up.

For the Supabase migration, AI concierge Edge Function, escrow milestones, analytics events, buyer groups, CRM tasks, and production release checks, see `docs/deployment/PRODUCTION_DEPTH_READINESS.md`.

## Android SDK requirement

Gradle needs a valid Android SDK path before it can build a debug APK.

Set one of these environment variables to your real SDK directory:

- `ANDROID_HOME`
- `ANDROID_SDK_ROOT`

Common Windows path:

```text
C:\Users\<you>\AppData\Local\Android\Sdk
```

If you prefer a project-local override, create `android/local.properties` with:

```text
sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```

This repo also includes a release checker:

```bash
npm run release:check
```

The checker fails if the Android SDK path is missing, the SPA rewrite is missing, native privacy files are missing, or required native permissions are absent. It warns for external production secrets that must be configured in Vercel, Supabase, Firebase, Apple, or provider dashboards.

## iOS Native Wrapper

The repo now also includes a Capacitor iOS project in `ios/`.

Useful commands:

```bash
npm run ios:sync
npm run ios:open
```

If you want a command-line simulator build on your Mac:

```bash
npm run ios:build:sim
```

## iOS build notes for your Mac

Before building on macOS:

1. Install Xcode from the App Store.
2. Open Xcode once and accept the license/install required components.
3. Make sure Command Line Tools are selected in Xcode settings.
4. Run `npm install` in the repo on your Mac.
5. Run `npm run ios:sync`.
6. Open the project with `npm run ios:open` and build from Xcode.

The generated project lives at:

```text
ios/App/App.xcodeproj
```

## Deep Links

The app normalizes trusted links into internal routes through `mobileDeepLinkService`.

Supported examples:

```text
baytmiftah://property/<listing-id>
baytmiftah://app/deals
https://baytmiftah.app/search?q=Labone
```
