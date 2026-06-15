# Capacitor mobile app

BaytMiftah ships as a **native iOS/Android app** using [Capacitor](https://capacitorjs.com/). The same React codebase powers the web app; inside the native shell the **mobile UI** (`MobileRoutes`) is always used.

## Prerequisites

| Platform | Tools |
|----------|--------|
| **Android** | [Android Studio](https://developer.android.com/studio), JDK 17+ |
| **iOS** | macOS, Xcode 15+ (build on Mac only) |

## Quick start (Android on Windows)

```powershell
# 1. Configure .env (Supabase keys required for live data)
cp .env.example .env

# 2. Build web assets and sync into native projects
npm run cap:sync

# 3. Open in Android Studio, then Run on device/emulator
npm run cap:android
```

Or run directly:

```powershell
npm run cap:run:android
```

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run build:app` | Vite production build → `dist/` |
| `npm run cap:sync` | Build + copy `dist/` into `android/` / `ios/` |
| `npm run cap:android` | Sync + open Android Studio |
| `npm run cap:ios` | Sync + open Xcode (macOS) |
| `npm run cap:run:android` | Sync + run on connected device/emulator |

After **every** web code change, run `npm run cap:sync` before testing in the native app.

## Project layout

```
capacitor.config.json   App id, name, webDir
android/                Generated Android project (after cap add android)
ios/                    Generated iOS project (after cap add ios, macOS)
dist/                   Web build consumed by Capacitor
```

## App identity

- **App ID:** `com.baytmiftah.app`
- **Display name:** BaytMiftah
- **Mobile UI:** forced when `Capacitor.isNativePlatform()` is true

## Auth & deep links

1. Add redirect URLs in **Supabase → Authentication → URL configuration**:
   - `https://your-domain.com/auth/callback`
   - For local dev: `http://localhost:5173/auth/callback`

2. For production native builds, also register a custom URL scheme in Supabase (optional):
   - `com.baytmiftah.app://auth/callback`

3. Google/Apple OAuth: enable providers in Supabase; no extra `VITE_*` keys.

## Push notifications (optional)

Web push uses `VITE_FCM_VAPID_KEY`. For native push, add `@capacitor/push-notifications` and configure FCM (Android) / APNs (iOS) — see Capacitor docs.

## Store release checklist

- [ ] Set `VITE_SUPABASE_*` and build with production env
- [ ] App icons & splash — run `npm run cap:assets` (sources in `assets/`; splash uses **logo-inverted** style)
- [ ] Signing keys (Android keystore, Apple developer account)
- [ ] Privacy policy URL in store listings
- [ ] Test login → role dashboard redirect on device

## Live reload (dev)

Point Capacitor at the Vite dev server:

```json
// capacitor.config.json — dev only, remove before store build
"server": {
  "url": "http://YOUR_LAN_IP:5173",
  "cleartext": true
}
```

Run `npm run dev`, then `npx cap run android -l`.
