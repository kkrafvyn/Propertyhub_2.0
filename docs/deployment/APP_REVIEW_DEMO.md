# App Review demo workspace

Run `node scripts/apple/provision-review-workspace.mjs` from the repository root to provision or restore the isolated review fixture using the configured Supabase project. The script never resets an existing password or changes unrelated organizations.

- Workspace: **BaytMiftah Review Demo** (`app-review-demo`).
- Reviewer login: `app-review-workspace@baytmiftah.com`.
- Generated password and fixture identifiers: `secrets/app-review/workspace.json` (gitignored, mode 0600). Never commit or include that file in public assets.
- Reviewer role: agent, scoped to the review organization; no platform administration or finance/team privileges.
- Data: three fictional properties, three private draft listings with existing illustrative project photography, four imported sample leads, and three sample enquiry cases used by the main pipeline.
- All properties explicitly say they are fictional and unavailable for transactions. No payments, KYC approvals, or legal acceptances are fabricated.
- The script verifies sign-in, organization membership, and private draft status. Anonymous access to the sample listings was also checked during release preparation.

For App Review, use the saved credentials, then open the review workspace. Explore **Properties & Listings**, **CRM / Sales → Leads**, and the workspace overview. No payment is needed to inspect the samples. Privileged operational roles continue to require MFA.

The four 1280 × 800 JPEG screenshots under `marketing/apple/workspace/screenshots/` are direct captures of the app's desktop UI, rendered locally with the same desktop build configuration and live private review fixture. They contain no real customer data and were not composited or resized. They show the portfolio, pipeline, workstation overview, and sign-in screen. App Store Connect received them on October 25, 2026.

Mac build 103 includes deferred Supabase auth follow-up work, access to the protected account security screen for MFA completion, the approved logo, and a logo size that fits the desktop header. Uploading/processing a build does not submit it for review or publish the app.

## Consumer reviewer account

Run `node scripts/apple/provision-review-consumer.mjs` to create or verify the isolated consumer reviewer login. Credentials are stored only in `secrets/app-review/consumer.json` (gitignored, mode 0600). The account has no organization membership, payment methods, completed transactions, or private customer data. Sign-in was verified through both Supabase and the consumer UI. Ghana / Accra and the Resident onboarding choice were completed without accepting the policy update banner.

Consumer reviewer credentials and notes were saved on the iOS and macOS App Store Connect versions. Four 1280 × 800 screenshots were accepted on the macOS listing: discovery, search, sign-in, and the consumer portal. The source captures are under `marketing/apple/consumer/screenshots/`. These are actual browser-rendered consumer screens, not native iOS simulator captures. The live marketplace currently shows no public properties; no fictional listings were published to fill it.

Apple's consumer iOS submission validation on October 25, 2026 reported a missing build and price tier. There are no consumer builds or Xcode Cloud products visible through the configured Apple API. Local Xcode 16.1 cannot produce the required iOS SDK 26 store build; the consumer Xcode Cloud workflow still requires its initial Xcode connection. Privacy disclosures remain drafts pending an explicit change to the user's prior instruction. Workspace Mac build 103 is now VALID but has not yet replaced selected build 102 in the listing.

## Logo restoration

At the owner's request, the app now uses the older centered dot-and-arc logo and original wordmark from before the uploaded-photo branding change. Native icons and the export generator have been restored to that mark. Existing uploaded builds and screenshots retain their previous artwork until replaced; no App Store update is implied by this source change.

The owner subsequently requested the arc shape from the supplied picture: the mark now uses a broad, tapered filled curve while retaining the older centered dot and wordmark. App, splash, web, and generated native icon sources use this arc.
