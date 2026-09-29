# Sign in with Apple (Web, iOS, iPad, Mac)

BaytMiftah uses **Supabase Auth** with Apple as an OAuth provider.

## Runtime flows

| Client | Redirect | Browser |
|--------|----------|---------|
| Web | `https://…/login?next=…` | Same tab / popup |
| Consumer iOS / Android (Capacitor) | `com.baymiftah.app://auth/callback` | Capacitor Browser (system) |
| Workspace iOS / Android (Capacitor) | `com.baymiftah.workspace://auth/callback` | Capacitor Browser (system) |
| Mac (Electron) | `baytmiftah://auth/callback` | Default OS browser via `openExternal` |

Desktop keeps `baytmiftah://auth/callback`; native apps use bundle-specific callbacks and a one-time OAuth state.
Code: `src/lib/native-oauth.ts`, `src/lib/desktop-oauth.ts`, `src/app/context/AuthContext.tsx`

## Important: Secret Key must be a JWT

Supabase’s Apple **Secret Key** field is **not** the `.p8` file contents.

Apple requires a **client secret JWT** signed with your `.p8` key (ES256). That JWT is what you paste into Supabase.

| Supabase field | Value |
|----------------|--------|
| **Client IDs** | Services ID (e.g. `com.baymiftah.web`). Also add bundle ID `com.baymiftah.app` if Supabase asks for native clients. |
| **Secret Key** | Generated JWT from `npm run apple:client-secret` |

### Generate the JWT

1. Apple Developer → create **Services ID** + **Sign in with Apple** key (download `AuthKey_XXXXX.p8`).
2. Put the `.p8` outside git, e.g. `secrets/AuthKey_XXXXX.p8` (folder is gitignored).
3. Add to `.env`:

```bash
APPLE_TEAM_ID=AB12CD34EF
APPLE_KEY_ID=XYZ123ABCD
APPLE_SERVICES_ID=com.baymiftah.web
APPLE_PRIVATE_KEY_PATH=./secrets/AuthKey_XYZ123ABCD.p8
```

4. Run:

```bash
npm run apple:client-secret
```

5. Copy the printed JWT → Supabase → Authentication → Providers → Apple → **Secret Key** → Save.

Or, with `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` configured, enable the provider without writing the JWT to disk:

```bash
npm run apple:configure-auth
```

The JWT expires about every **6 months**. Re-run the script and update Supabase before it expires.

## One-time Apple + Supabase setup

1. **Apple Developer**
   - App ID `com.baymiftah.app` with Sign in with Apple
   - Services ID for web/Electron OAuth (return URL = your Supabase callback, e.g. `https://<project-ref>.supabase.co/auth/v1/callback`)
   - Sign in with Apple key (`.p8`), Team ID, Key ID
2. **Supabase** → Authentication → Providers → Apple → enable; Client ID = Services ID; Secret = JWT from step above
3. **Redirect URLs** include:
   - `baytmiftah://auth/callback` (Electron)
   - `com.baymiftah.app://auth/callback` (consumer app)
   - `com.baymiftah.workspace://auth/callback` (Workspace app)
   - production HTTPS app origins
4. Run `npm run supabase:configure-auth` to push the allowlist from `.env`

Credentials stay in Apple Developer + Supabase Dashboard (never commit `.p8` or JWTs).

## Mac packaging

electron-builder registers the `baytmiftah` protocol under `build.protocols` and builds macOS targets under `build.mac` in `package.json`.

Build the unsigned local DMG and ZIP with:

```bash
npm run desktop:pack:mac
```

Artifacts are written to `dist-desktop/`. Configure Apple Developer signing and
notarization before external distribution.
