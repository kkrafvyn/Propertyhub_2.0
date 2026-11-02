# Apple listing assets

**Start here:** [`APP_STORE_CONNECT.md`](APP_STORE_CONNECT.md) — Apple sizes, generate commands, upload steps.

## Quick commands

```bash
npm run apple:export-store-assets -- --force
node scripts/apple/export-store-icons.mjs
npm run apple:validate-store-assets
```

**App preview video:** in-app UI only — `npm run apple:record-app-preview -- consumer|workspace` (not brag).

**Upload to App Store Connect:** `consumer/connect-upload/` and `workspace/connect-upload/` (6 × 1290×2796 JPEGs + 886×1920 in-app app preview MP4).

Store copy: [`consumer/store-listing.md`](consumer/store-listing.md), [`workspace/store-listing.md`](workspace/store-listing.md).

Icons: `export-store-icons.mjs` writes opaque **1024×1024** PNGs and updates iOS asset catalogs (consumer green, workspace navy). The listing icon comes from the **uploaded binary**, not from screenshot wells.

Legacy JPGs in `screenshots/` are old browser references. Prefer `screenshots/iphone-6.7/` or native TestFlight captures for review-sensitive flows.

URLs: **https://www.baytmiftah.com**, **https://app.baytmiftah.com**, privacy `/legal/privacy`, **support@baytmiftah.com**.

See also [STORE_SUBMISSION_ASSETS.md](../../docs/deployment/STORE_SUBMISSION_ASSETS.md), [APPLE_STORE_UPLOAD.md](../../docs/deployment/APPLE_STORE_UPLOAD.md).
