# App Store Release Notes

This file turns the current mobile behavior into store-disclosure inputs. Final answers must match counsel-approved privacy copy and the live production configuration.

## Public URLs

- Privacy URL: `https://baytmiftah.app/legal/privacy`
- Terms URL: `https://baytmiftah.app/legal/terms`
- Support URL: use the production support page or support email configured for launch.
- Marketing URL: use the production landing page or app download page.
- Configure the final `baytmiftah.app` domain before using these URLs in store submissions.

## Apple App Privacy details

BaytMiftah should be reviewed as a property marketplace, communication, buyer workflow, and support app. Current app behavior can involve:

- Contact Info: name, email address, phone number.
- User Content: messages, notes, support requests, uploaded property photos, deal documents, and scanned documents.
- Location: precise or approximate location only when users request near-me sorting or field-note context.
- Identifiers: user ID, device push token, session or account identifiers.
- Usage Data: product interaction events, listing views, save/share/inquiry events, and app diagnostics.
- Financial Info: payment or escrow workflow references when users open payment features; do not disclose direct card storage unless that is added later.

Recommended purpose mapping:

- App Functionality: account, listings, messages, buying groups, deal rooms, payments, support, alerts, offline drafts, app lock.
- Analytics: listing views, product interactions, performance and reliability events.
- Fraud Prevention, Security, and Compliance: verification requests, trust review events, app lock, audit trails, suspicious activity review.

Tracking posture:

- Do not mark data as tracking unless the production app uses it to track users across third-party apps or websites.
- If advertising or cross-app tracking is added later, update this file, App Store Connect, Play Console, `/legal/privacy`, and mobile onboarding before release.

## iOS privacy manifest

The repo includes `ios/App/App/PrivacyInfo.xcprivacy` and usage descriptions in `ios/App/App/Info.plist`.

Before App Store upload:

- Confirm the privacy manifest reflects the final production data collection.
- Confirm every iOS permission prompt is truthful and specific.
- Confirm third-party SDK privacy manifests are included by their packages or documented by the SDK vendor.

## Google Play Data safety

Current app behavior can involve these Play Console Data safety categories:

- Personal info: name, email address, phone number.
- Photos and videos: property photos and uploaded media selected by the user.
- Files and docs: scanned deal documents or verification documents.
- Location: approximate or precise location when users request location-based features.
- App activity: listing views, searches, saved listings, inquiries, messages, deal room actions, support actions.
- App info and performance: diagnostics, crash context, app version, platform, device push registration state.
- Financial info: payment or escrow transaction references when payment features are enabled.

Suggested disclosure posture:

- Data is collected for app functionality, analytics, fraud prevention/security/compliance, and account management.
- Data is encrypted in transit through HTTPS.
- Users can request help with access, correction, or deletion through support where legally and operationally permitted.
- Some data is shared with service providers, property teams, workspace members, payment/escrow providers, hosting, analytics, and support partners when needed to provide requested features.

## Store review notes

Explain these points in review notes when submitting:

- OTP codes are used only for two-factor verification, not as a passwordless login path.
- Camera is used for property photos and document scans initiated by the user.
- Location is used only for near-me sorting or optional field-note context.
- Push notifications are optional and can be disabled in device settings.
- Offline drafts are stored locally until the user sends them, deletes them, or clears app data.
- Buying guides and AI help are informational workflow tools, not legal, tax, valuation, mortgage, title, or investment advice.
