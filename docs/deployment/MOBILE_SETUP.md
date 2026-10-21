# Mobile Setup

## PWA

The web app ships with:

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

The repo includes a Capacitor Android project in `android/`.

```bash
npm run android:sync
npm run android:open
npm run android:gradle:debug
npm run android:build
```

### Android SDK requirement

Set `ANDROID_HOME` or `ANDROID_SDK_ROOT`, or create `android/local.properties` with:

```text
sdk.dir=/Users/<you>/Library/Android/sdk
```

## iOS Native Wrapper (consumer)

App ID: `com.baymiftah.app`
Display name: **BaytMiftah**
Native workspace: `ios/App/App.xcworkspace`

### Prerequisites (Mac)

1. Install **Xcode** (App Store or beta) and open it once to finish setup.
2. Point CLI tools at Xcode (not only Command Line Tools):

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
# or, if using a Desktop beta:
sudo xcode-select -s /Users/macpro/Desktop/Xcode-beta.app/Contents/Developer
```

3. Accept the license: `sudo xcodebuild -license accept`
4. Install CocoaPods (`gem install cocoapods` or `brew install cocoapods`). It resolves the native Capacitor plugins during `npm run ios:sync`.
5. Apple Developer account + Team ID for device/TestFlight builds (simulator can use automatic signing without a paid team).

### Environment

```bash
cp .env.example .env
# Required for a working app binary:
#   VITE_SUPABASE_URL=
#   VITE_SUPABASE_ANON_KEY=   (or VITE_SUPABASE_PUBLISHABLE_KEY)
```

Also add `baytmiftah://auth/callback` (and your production HTTPS origins) to Supabase Auth → Redirect URLs.

### Sign in with Apple / Google (iPhone, iPad, Mac)

Native and desktop apps open OAuth in the **system browser**, then return via:

```text
baytmiftah://auth/callback
```

| Surface | How it works |
|---------|----------------|
| iPhone / iPad | `@capacitor/browser` + `@capacitor/app` `appUrlOpen` → `exchangeCodeForSession` |
| Mac Electron | `shell.openExternal` + `baytmiftah` protocol (electron-builder `protocols`) |
| Web | Standard Supabase HTTPS redirect |

**Apple Developer / Supabase (required once):**

1. Apple Developer → App ID `com.baymiftah.app` → enable **Sign in with Apple**.
2. Create a **Services ID** for web/Electron OAuth; create a Sign in with Apple key (`.p8`) + note Team ID + Key ID.
3. Generate the **client secret JWT** (Supabase Secret Key is a JWT, not the raw `.p8`):

```bash
# .env: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY_PATH
npm run apple:client-secret
```

4. Supabase Dashboard → Authentication → Providers → **Apple**: Client ID = Services ID; Secret Key = JWT; enable the provider.
5. Redirect allowlist must include `baytmiftah://auth/callback` (and `baytmiftah://auth/callback/**`).
6. With `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` in `.env`, run:

```bash
npm run supabase:configure-auth
```

Full details: [APPLE_SIGN_IN.md](./APPLE_SIGN_IN.md).

### Sync & open

```bash
npm install
npm run ios:sync          # builds web + cap sync into ios/
npm run ios:open          # opens ios/App/App.xcworkspace in Xcode
```

### Simulator CLI build

```bash
export DEVELOPER_DIR=/Users/macpro/Desktop/Xcode-beta.app/Contents/Developer   # if needed
npm run ios:build:sim
```

Open and archive the `.xcworkspace`, not `App.xcodeproj`; the workspace includes
the CocoaPods-built Capacitor and native-plugin frameworks. The current
`IONGeolocationLib` CocoaPod is a prebuilt Swift framework, so use an Xcode
toolchain compatible with that release when compiling (the bundled framework
requires Swift 6.2 or newer).

### What is already configured in `ios/`

| Item | Detail |
|------|--------|
| Bundle ID | `com.baymiftah.app` |
| Version | Marketing `1.0.0` / Build `1` |
| Min iOS | 15.0 |
| Privacy usage strings | Camera, Photos, Location, Microphone, Face ID |
| Privacy manifest | `App/PrivacyInfo.xcprivacy` |
| Entitlements | Keychain access group for biometric credentials |
| URL schemes | `baytmiftah`, `com.baymiftah.app` |
| Export compliance | `ITSAppUsesNonExemptEncryption = false` |
| Icons / splash | `Assets.xcassets` (1024 App Store icon present) |

### App Store / TestFlight checklist

1. In Xcode → Signing & Capabilities: select your **Team** (fills `DEVELOPMENT_TEAM`).
2. Product → Archive → Distribute App → App Store Connect / TestFlight.
3. App Store Connect: privacy nutrition labels should match `PrivacyInfo.xcprivacy` (account, location, photos, payments, device ID — app functionality, not tracking).
4. Screenshots for 6.7" and 6.1" iPhones (and iPad if you keep `TARGETED_DEVICE_FAMILY = 1,2`).

## Business mobile (Workspace)

Second app ID: `com.baymiftah.workspace`

```bash
npm run mobile:business:provision
npm run mobile:business:sync
npm run ios:business:open
```

Native trees are generated under `ios-business/` and `android-business/` (not always committed).

## Release pre-flight

```bash
npm run mobile:release
```

Validates Capacitor config, Android permissions, iOS privacy keys, then builds + syncs.

## Google Play (Consumer + Workspace)

Signed AAB builds and CI upload to Play Console are documented in [GOOGLE_PLAY_UPLOAD.md](./GOOGLE_PLAY_UPLOAD.md).

```bash
npm run android:consumer:bundle:release   # com.baymiftah.app
npm run android:workspace:bundle:release  # com.baymiftah.workspace
```
