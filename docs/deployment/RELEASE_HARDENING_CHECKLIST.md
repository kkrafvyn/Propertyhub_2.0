# Release Hardening Checklist

Use this as the final release gate for the web app, native apps, Supabase, and store submission.

## Counsel sign-off

- Confirm `/legal/terms` has counsel-approved Terms of Use.
- Confirm `/legal/privacy` has counsel-approved Privacy Notice.
- Confirm the mobile onboarding consent language matches the approved legal copy.
- Confirm App Store App Privacy and Google Play Data safety answers match the approved Privacy Notice.
- Keep dated copies of approved legal text and store disclosure answers outside the repo.

## Native SDK and builds

- Run `npm run release:check`.
- Run `npm test`.
- Run `npm run build`.
- Run `npm run prod:env:check -- --env-file=.env.production` before deployment.
- Run `npm run prod:env:check:strict -- --env-file=.env.production` before native push or Smart Property Access launch.
- Follow `docs/deployment/PRODUCTION_PROVIDER_ACTIVATION.md` for Paystack, Stripe, Resend, audit anchoring, and IoT provider setup.
- Run `npm run cap:sync`.
- Confirm `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or `android/local.properties` points to a real Android SDK.
- Run `npm run android:build` before Play Store submission.
- Build iOS from Xcode on macOS after `npm run ios:sync`.
- Confirm Android version code and iOS build number are incremented before each store upload.

## Native push

- Browser push needs `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, and `WEB_PUSH_CONTACT_EMAIL`.
- Android push needs either `FCM_PROJECT_ID` plus `FCM_ACCESS_TOKEN`, or `FCM_SERVER_KEY`.
- iOS push needs `APNS_BEARER_TOKEN`, `APNS_BUNDLE_ID`, and `APNS_USE_SANDBOX` set correctly per environment.
- Android release builds should include the Firebase `google-services.json` file for the final package ID.
- Test push delivery on a real Android device and a real iPhone before relying on production alerts.

## Security and operations

- Run `npm audit --omit=dev`; production dependencies must be clean before deploy.
- Track the full dev audit separately and resolve any remaining development-tool findings before release.
- Run `supabase/queries/production_rls_audit.sql` in Supabase SQL editor.
- Confirm RLS is enabled on every public table exposed through the Data API.
- Confirm anonymous users cannot select `analytics_events`.
- Confirm buyer group, escrow, CRM, messages, and trust review policies enforce account and organization boundaries.
- Enable Supabase automated backups and point-in-time recovery where plan support allows it.
- Configure Vercel production alerts, deployment notifications, and uptime checks.
- Confirm error reporting destination before public launch. Use the native platform crash dashboards plus Vercel runtime/deployment logs at minimum.
- Run a production smoke test after every deploy: `/`, `/search`, `/legal/terms`, `/legal/privacy`, `/app`, and one public listing page.

## Product data

- Replace seed or demo media before public marketing campaigns.
- Confirm property photos have usage rights and accurate alt text.
- Confirm agency names, addresses, prices, and contact paths are real or intentionally marked as sample data.
- Confirm payment instructions are never sent only through chat; they must live in verified payment or escrow flows.

## Store submission

- Prepare final screenshots for iPhone, iPad if supported, and Android phone.
- Prepare App Store App Privacy answers from `docs/deployment/APP_STORE_RELEASE.md`.
- Prepare Google Play Data safety answers from `docs/deployment/APP_STORE_RELEASE.md`.
- Confirm age rating, support URL, marketing URL, privacy URL, and terms URL.
- Submit beta builds first: TestFlight for iOS and internal testing track for Google Play.
