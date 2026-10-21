# Google Play — assets & launch pack

Use this folder for **Play Console store listing** files. CI builds and uploads **AABs** separately ([GOOGLE_PLAY_UPLOAD.md](../../docs/deployment/GOOGLE_PLAY_UPLOAD.md)).

## Apps (two listings)

| Variant | Package | Play listing folder |
|---------|---------|---------------------|
| Consumer | `com.baymiftah.app` | [`consumer/`](./consumer/) |
| Workspace | `com.baymiftah.workspace` | [`workspace/`](./workspace/) |

## Generate icons (512×512 for Play)

```bash
npm run play:export-assets
```

Sources: `public/brand/app-icon.svg`, `public/brand/app-icon-workspace.svg`.  
In-app launcher PNGs: `android/.../mipmap-*` and `android-business/.../mipmap-*`.

## What you still upload manually in Play Console

| Asset | Spec | Where to put it |
|-------|------|-----------------|
| **App icon** | 512×512 PNG, 32-bit, max 1 MB | `consumer/play-store-icon-512.png` (generated) |
| **Feature graphic** | 1024×500 PNG or JPG | Add `feature-graphic.png` per variant (not auto-generated) |
| **Phone screenshots** | 2–8 shots; min 320px short side; max 3840px long side; 16:9 or 9:16 | `consumer/screenshots/phone/` (capture from device or emulator) |
| **7-inch tablet** | Optional | `*/screenshots/tablet-7/` |
| **10-inch tablet** | Optional | `*/screenshots/tablet-10/` |

Suggested phone sizes to satisfy Play: **1080×1920** (portrait) or **1920×1080** (landscape).

### Screenshot ideas (Consumer)

1. Home / search  
2. Property detail + map  
3. Short-stay booking  
4. My applications / journey  
5. Messages with host  
6. Wallet / payments (if enabled)

### Screenshot ideas (Workspace)

1. Dashboard  
2. Listings pipeline  
3. Leads / enquiries  
4. Calendar or viewings  
5. Team / org settings  

## Store copy

Edit and paste from:

- [`consumer/store-listing.md`](./consumer/store-listing.md)
- [`workspace/store-listing.md`](./workspace/store-listing.md)

## URLs (production)

Replace `https://YOUR_PRODUCTION_DOMAIN` with your live site (e.g. Vercel):

| Field | Path |
|-------|------|
| Privacy policy | `https://YOUR_PRODUCTION_DOMAIN/legal/privacy` |
| Terms | `https://YOUR_PRODUCTION_DOMAIN/legal/terms` |
| Support email | `support@baytmiftah.com` (see `src/lib/legal-config.ts`) |
| Marketing / website | Same production domain |

## Auth (required for login)

Supabase → Authentication → Redirect URLs:

- `com.baymiftah.app://auth/callback`
- `com.baymiftah.workspace://auth/callback`
- `baytmiftah://auth/callback` (if used on consumer)

Details: [MOBILE_SETUP.md](../../docs/deployment/MOBILE_SETUP.md).

## GitHub secrets (CI upload)

| Secret | Required |
|--------|----------|
| `PLAY_SERVICE_ACCOUNT_JSON` | Yes |
| `PLAY_CONSUMER_KEYSTORE_B64` + passwords + alias | Consumer builds |
| `PLAY_WORKSPACE_KEYSTORE_B64` + passwords + alias | Workspace builds |
| `VITE_SUPABASE_URL` | Yes |
| `VITE_SUPABASE_ANON_KEY` | Yes |

Keystore creation (once per app): see [GOOGLE_PLAY_UPLOAD.md](../../docs/deployment/GOOGLE_PLAY_UPLOAD.md).

## Push a build

1. `npm run mobile:release` (local pre-flight)  
2. GitHub → **Google Play Upload** → variant `consumer` or `both`, track **internal**, version e.g. `1.0.0`  
3. Play Console → finish **Data safety**, **Content rating**, **Target audience**, store listing assets above  
4. Promote internal → closed → production when ready  

## Play Console checklist (both apps)

- [ ] App created with correct package name  
- [ ] Play App Signing enabled  
- [ ] First manual AAB upload (if Google requires it on new account)  
- [ ] Service account invited (Release manager)  
- [ ] Store listing: title, short + full description, icon, feature graphic, screenshots  
- [ ] Privacy policy URL  
- [ ] Data safety form (align with app permissions: camera, location, photos, payments)  
- [ ] Content rating questionnaire  
- [ ] Target audience / ads declaration  
- [ ] Countries / pricing  
