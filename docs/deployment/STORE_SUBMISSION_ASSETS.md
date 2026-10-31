# Store submission assets (Android + iOS)

BaytMiftah ships **two native apps** (consumer + workspace). This doc maps **brag / Hyperframes** outputs to **Google Play** and **App Store Connect** requirements.

## Quick generate

```bash
# 1) Render brag videos (if brag-output/*.mp4 missing or stale)
node scripts/render-brag-variants.mjs --quality high
node scripts/render-brag-ads.mjs --quality high --only listings

# 2) Export JPEG screenshots, feature graphics, app preview MP4s
npm run brag:export-store-assets
```

Requires **ffmpeg** on your PATH.

## Output layout

| Asset | Spec | Path |
|-------|------|------|
| Play phone screenshots | 1080×1920 JPEG, 2–8 per listing | `marketing/google-play/{consumer,workspace}/screenshots/phone/` |
| Play feature graphic | 1024×500 JPEG | `marketing/google-play/{consumer,workspace}/feature-graphic.jpg` |
| Play promo video | H.264 MP4 ≤30s (optional) | `marketing/google-play/{consumer,workspace}/app-preview.mp4` |
| App Store 6.7" screenshots | 1290×2796 JPEG (padded from 9:16 brag) | `marketing/apple/{consumer,workspace}/screenshots/iphone-6.7/` |
| App Store app preview | H.264 MP4 ≤30s (optional) | `marketing/apple/{consumer,workspace}/app-preview.mp4` |
| Icons | Play 512×512; Apple 1024×1024 | `npm run play:export-assets` + `node scripts/apple/export-store-icons.mjs` |
| Manifest | Machine-readable index | `marketing/store-submission-manifest.json` |

Store copy and URLs: `marketing/google-play/*/store-listing.md`, `marketing/apple/README.md`.

## Platform rules (checklist)

### Google Play (both packages)

- [ ] **App icon** 512×512 PNG (`play-store-icon-512.png`)
- [ ] **Feature graphic** 1024×500 (required for featuring)
- [ ] **Phone screenshots** min 2, max 8; short side ≥320px; 16:9 or 9:16
- [ ] **Privacy policy URL** — `https://www.baytmiftah.com/legal/privacy`
- [ ] **Data safety**, content rating, target audience
- [ ] Package: `com.baymiftah.app` / `com.baymiftah.workspace`

See [GOOGLE_PLAY_UPLOAD.md](./GOOGLE_PLAY_UPLOAD.md) and [marketing/google-play/README.md](../../marketing/google-play/README.md).

### App Store Connect (both apps)

- [ ] **App icon** from build (1024×1024 in repo for reference)
- [ ] **6.7" display** screenshot set (1290×2796) — brag export folder `iphone-6.7/`
- [ ] **App preview** (optional): 15–30s, H.264; same aspect as supported preview size for your primary locale
- [ ] **Privacy policy URL**, support URL, marketing URL
- [ ] Bundle IDs: `com.baymiftah.app` (consumer), `com.baymiftah.workspace` (workspace)

Brag stills are **marketing compositions** (device frame + product story), not simulator captures. For review, Apple may also expect at least some **in-app** screenshots from TestFlight builds—capture those on device/emulator when possible and mix with brag frames if needed.

See [APPLE_STORE_UPLOAD.md](./APPLE_STORE_UPLOAD.md).

## Production URLs

| Field | URL |
|-------|-----|
| Web app | `https://app.baytmiftah.com` |
| Marketing / legal | `https://www.baytmiftah.com` |
| Privacy | `https://www.baytmiftah.com/legal/privacy` |
| Support | `support@baytmiftah.com` |

## Regenerating after product changes

1. Update Hyperframes compositions under `brag-output/composition-*`.
2. Re-render MP4s.
3. Run `npm run brag:export-store-assets -- --force`.
4. Re-upload in Play Console / App Store Connect.
