# Workspace iPhone and iPad releases with Xcode Cloud

Open `ios-business/App/App.xcworkspace` in Xcode. The shared **App** scheme supports archiving and the `ci_scripts/ci_post_clone.sh` hook installs Node/CocoaPods, builds the business web UI, and syncs native dependencies.

Initial setup must be completed in Xcode: Product → Xcode Cloud → Create Workflow. Select the Prosper Ocloo / Infinitek team `7T2JK53K5M`, connect `kkrafvyn/Propertyhub_2.0`, and select the workspace above with the App scheme. Use an available stable Xcode 26 or later, archive iOS using Release, and enable App Store Connect distribution. The bundle identifier is `com.baymiftah.workspace`; create a matching App Store Connect record if it does not already exist.

Set workflow environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the production frontend values (the service-role key must never be used). These settings already exist locally in `.env`; do not commit that file. The Cloud hook disables demo data. Use workflow-managed build numbers and select version 1.0.0 or the desired release version in the project.

Once the initial repository connection and workflow are configured in Xcode, builds can be started and inspected from the Xcode Cloud page in App Store Connect. This route uses Apple's compute allowance rather than GitHub Actions runners. Uploading a build does not submit it for App Review or make it publicly available.

## Consumer iPhone and iPad app

The consumer project now also includes a shared App scheme and a post-clone hook.
For its separate workflow, select `ios/App/App.xcworkspace`, the App scheme, and
bundle identifier `com.baymiftah.app` (App Store Connect app `6811717467`). The hook
runs `npm run mobile:consumer:sync`. Use the same team and public frontend
environment variables described above. The consumer workflow needs its own
initial Xcode connection; configuring the Workspace workflow alone does not
create the consumer workflow.
