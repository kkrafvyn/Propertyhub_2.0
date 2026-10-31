# Apple listing assets

Run `node scripts/apple/export-store-icons.mjs` from the repository root to
export the existing brand artwork as opaque 1024 x 1024 PNG icons and update
both iOS app icon catalogs. Consumer uses green; Workspace uses navy.

The App Store icon comes from the uploaded native build. These PNGs must be
included in a new archive to update the listing icon; uploading a screenshot
does not update the app icon.

Screenshots and listing drafts are collected in the sibling workspace folder
`../apple-store-assets`. Browser captures there are labeled as references.
They are not native iPhone, iPad, or Mac screenshots and must not be described
as native captures. Native screenshots still need to be captured from the
correct app and device. Do not resize browser references to imply native use.

Listing URLs: **https://www.baytmiftah.com** (marketing/legal), **https://app.baytmiftah.com** (web app), privacy at `/legal/privacy`, support `support@baytmiftah.com`.

**6.7" screenshots + app preview** from brag: run `npm run brag:export-store-assets` → `screenshots/iphone-6.7/` and `app-preview.mp4`. See [STORE_SUBMISSION_ASSETS.md](../../docs/deployment/STORE_SUBMISSION_ASSETS.md).

Legacy JPGs in `screenshots/` are browser references; prefer brag `iphone-6.7/` or native TestFlight captures for App Store Connect.
