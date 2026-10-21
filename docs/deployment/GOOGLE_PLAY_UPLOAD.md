# Google Play uploads (Consumer + Workspace)

Workflow: `.github/workflows/play-store.yml` → **Google Play Upload**.

Builds signed **AAB** files and uploads them with the Play Developer API. You still complete store listing, Data safety, content rating, and review in [Google Play Console](https://play.google.com/console).

| Variant | Package name | Android tree |
|---------|--------------|--------------|
| Consumer (BaytMiftah) | `com.baymiftah.app` | `android/` |
| Workspace | `com.baymiftah.workspace` | `android-business/` |

## One-time Play Console setup

1. Create **two apps** in Play Console (one per package name above).
2. Enable **Google Play Android Developer API** for your Google Cloud project.
3. Create a **service account** with access to both apps (Play Console → Users and permissions → Invite user → Service account → Release manager or Admin).
4. Download the service account **JSON key** (store as a GitHub secret only).
5. For each app, complete the first-time requirements (privacy policy URL, app category, target audience). Google may require **one manual AAB upload** before API uploads work on some accounts.

## Upload keystore (one per app)

Use **Play App Signing** (recommended). Create an upload keystore per app:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore consumer-upload.keystore \
  -alias baytmiftah-consumer -keyalg RSA -keysize 2048 -validity 10000
```

Repeat for Workspace with a different alias/file. Base64-encode for GitHub:

```bash
# macOS / Linux
base64 -i consumer-upload.keystore | pbcopy
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("consumer-upload.keystore")) | Set-Clipboard
```

Never commit keystore files or passwords to git.

## GitHub Actions secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `PLAY_SERVICE_ACCOUNT_JSON` | Full JSON contents of the Play API service account key |
| `PLAY_CONSUMER_KEYSTORE_B64` | Base64 upload keystore for `com.baymiftah.app` |
| `PLAY_CONSUMER_KEYSTORE_PASSWORD` | Keystore password |
| `PLAY_CONSUMER_KEY_ALIAS` | Key alias |
| `PLAY_CONSUMER_KEY_PASSWORD` | Key password |
| `PLAY_WORKSPACE_KEYSTORE_B64` | Base64 upload keystore for `com.baymiftah.workspace` |
| `PLAY_WORKSPACE_KEYSTORE_PASSWORD` | Keystore password |
| `PLAY_WORKSPACE_KEY_ALIAS` | Key alias |
| `PLAY_WORKSPACE_KEY_PASSWORD` | Key password |
| `VITE_SUPABASE_URL` | Production Supabase URL baked into the app |
| `VITE_SUPABASE_ANON_KEY` | Anon/publishable key only (never service role) |

## Run the workflow

1. Actions → **Google Play Upload** → **Run workflow**.
2. Choose **variant**: `both`, `consumer`, or `workspace`.
3. Set **version** (e.g. `1.0.0`). **versionCode** uses the GitHub run number.
4. Start with **track** `internal`, **status** `completed` (or `draft` while testing).

Artifacts retain the AAB for seven days. Successful API upload sends the build to the chosen track; promotion to production is still done in Play Console.

## Local signed AAB (optional)

Set the same `PLAY_<VARIANT>_KEYSTORE_*` variables (or export `ANDROID_KEYSTORE_*` after decoding the keystore), then:

```bash
# Consumer
set PLAY_VARIANT=consumer
set PLAY_CONSUMER_KEYSTORE_B64=...
# ... other PLAY_CONSUMER_* vars
npm run android:consumer:bundle:release

# Workspace
npm run android:workspace:bundle:release
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` or `android-business/...`.

## OAuth / deep links

Redirect URLs for native auth must include:

- Consumer: `com.baymiftah.app` scheme / `baytmiftah://auth/callback` (see [MOBILE_SETUP.md](./MOBILE_SETUP.md))
- Workspace: `com.baymiftah.workspace://auth/callback`

Configure matching entries in Supabase Auth → Redirect URLs.

## Related

- Apple uploads: [APPLE_STORE_UPLOAD.md](./APPLE_STORE_UPLOAD.md)
- Mobile pre-flight: `npm run mobile:release`
