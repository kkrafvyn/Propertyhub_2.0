# Workspace App Store uploads

Workflow: `.github/workflows/apple-store.yml` → **Apple Store Upload**.
Builds the workspace for iPhone/iPad and a universal Electron Mac App Store package on GitHub-hosted macOS with Xcode 26+. This does not need a local Xcode upgrade.

Use only Prosper Ocloo / Infinitek team **7T2JK53K5M** and bundle ID **com.baymiftah.workspace**. Create the iOS and macOS platform records in App Store Connect before uploading. Enable the capabilities required by the native entitlements in the distribution profiles.

Configure repository Actions secrets:

- `ASC_KEY_ID`, `ASC_ISSUER_ID`: App Store Connect API key metadata.
- `ASC_PRIVATE_KEY`: raw PEM contents of its `.p8` key, with permission to upload builds. This is a separate key from Sign in with Apple.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: production frontend configuration. Never use the service-role key as the anon key.
- `IOS_DISTRIBUTION_P12`: base64-encoded Apple Distribution certificate **with private key**.
- `IOS_P12_PASSWORD`: password protecting that export.
- `IOS_WORKSPACE_PROFILE`: base64-encoded workspace iOS App Store distribution profile.
- `MAC_APPLICATION_P12`, `MAC_APPLICATION_PASSWORD`: base64-encoded Mac App Store application signing certificate/private key and its export password.
- `MAC_INSTALLER_P12`, `MAC_INSTALLER_PASSWORD`: base64-encoded Mac App Store installer certificate/private key and its export password (not Developer ID Installer).
- `MAC_WORKSPACE_PROFILE`: base64-encoded workspace Mac App Store distribution profile.

Use nonempty passwords for certificate exports. Configure secrets through GitHub Settings → Secrets and variables → Actions. Never commit certificates, private keys or profiles.

Run the workflow with platform `both`, `ios` or `macos` and the desired version (default `1.0.0`). Build numbers increment with workflow runs. If an existing store build has a higher number, adjust the build-number scheme before uploading.

The credentials job fails before provisioning paid macOS runners if secrets are missing. Native profile validation checks team, exact bundle ID, expiration and distribution type. The iOS build uses the CocoaPods workspace, not the standalone project. Each package is validated before uploading with Apple's command-line upload tool. Signed packages and logs are retained for seven days; temporary signing credentials are removed on exit.

A successful upload delivers a build to App Store Connect. Apple processing, screenshots, privacy disclosures, review information and submission for App Review are still required before public availability. This workflow does not automatically publish an app or invent listing information.
