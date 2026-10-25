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
