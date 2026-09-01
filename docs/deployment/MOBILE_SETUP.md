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
