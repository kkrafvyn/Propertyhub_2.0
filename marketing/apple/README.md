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

Both listing drafts use https://baytmiftah.com, with `/help` for support and
`/legal/privacy` for the privacy policy, as requested by the owner. DNS checking
is deferred at the owner's request. External listing saves remain unverified.
