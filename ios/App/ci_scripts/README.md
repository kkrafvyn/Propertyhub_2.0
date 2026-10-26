# Consumer Xcode Cloud workflow

Open `ios/App/App.xcworkspace` and create the initial workflow in Xcode.

- Account/team: Prosper Ocloo / Infinitek (`7T2JK53K5M`).
- Repository: `kkrafvyn/Propertyhub_2.0`, branch `main`.
- Shared scheme: `App`.
- Bundle identifier: `com.baymiftah.app` (consumer App Store Connect app `6811717467`).
- Xcode: stable 26 or later, with the default compatible macOS image.
- Action: Archive, iOS, Release, distribute to App Store Connect/TestFlight.
- Start condition: changes on `main`, or a manual run.

Add the production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
from the project's local environment to the workflow environment. Do not use
a Supabase service-role key. Do not commit credentials or a local `.env` file.
These two frontend settings are included in the distributed app bundle.

The post-clone script installs Node/CocoaPods when needed, installs locked npm
dependencies, generates consumer icons, builds the production web bundle with
demo data disabled, and syncs Capacitor dependencies. It then sets the native
build number from `CI_BUILD_NUMBER`. Keep that cloud run number higher than
any build number already uploaded for this app.

Automatic signing uses the team configured in the native project. Enable
App Store Connect distribution in the workflow; a successful archive alone
does not upload a build. After processing, select that consumer build in
App Store Connect's iOS version before submitting for review.

This workflow builds the iPhone/iPad consumer app. It does not build Workspace
or a separate macOS app, and it does not publish privacy disclosures.
