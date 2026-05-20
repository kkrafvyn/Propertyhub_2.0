# BaytMiftah Production Provider Activation

Use this runbook after the local QA checks pass and before public launch. It covers the live provider setup that cannot be completed from the codebase alone.

## 1. Local Release Gate

Run these before touching production credentials:

```bash
npm run qa:local
npm run prod:env:check -- --env-file=.env.production
```

For native app release or Smart Property Access launch, use strict mode:

```bash
npm run prod:env:check:strict -- --env-file=.env.production
```

You can also gate one workstream at a time while you are still adding keys:

```bash
npm run prod:env:check -- --strict-payments --env-file=.env.production
npm run prod:env:check -- --strict-comms --env-file=.env.production
npm run prod:env:check -- --strict-identity --env-file=.env.production
npm run prod:env:check -- --strict-data --env-file=.env.production
npm run prod:env:check -- --strict-ops --env-file=.env.production
```

The environment checker only reports whether values are present. It never prints secret values.

## 2. Paystack Ghana Lane

- Create live Paystack subscription plans for Starter, Growth, and Pro.
- Set `PAYSTACK_PLAN_CODE_STARTER`, `PAYSTACK_PLAN_CODE_GROWTH`, and `PAYSTACK_PLAN_CODE_PRO`.
- Create or confirm the BaytMiftah escrow/master account flow.
- Configure transfer recipients or subaccounts for agencies before enabling escrow release.
- Set `PAYSTACK_DEFAULT_ESCROW_RECIPIENT_CODE` only as a safe fallback for controlled testing.
- Configure the live webhook URL to the deployed `payment-webhook` function.
- Set `PAYSTACK_WEBHOOK_SECRET` and verify signed webhooks are accepted.
- Run sandbox and live-low-value tests for subscription creation, renewal, failure, escrow collection, release, refund, and duplicate webhook replay.

## 3. Stripe Diaspora Lane

- Create live Stripe products and prices for USD and GBP Starter, Growth, and Pro tiers.
- Set all `STRIPE_PRICE_ID_*` values.
- Configure the live webhook URL to the deployed `payment-webhook` function.
- Set `STRIPE_WEBHOOK_SECRET`.
- Confirm Stripe account settings for international cards, payout schedule, and supported currencies.
- If Stripe Connect payouts are enabled, complete Connect onboarding and test transfer/refund paths.
- Run sandbox tests for checkout, subscription, failed payment, escrow payment, release, refund, dispute, and duplicate webhook replay.

## 4. Email And Notifications

- Verify the sending domain in Resend.
- Set `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM`, and `NOTIFICATION_EMAIL_REPLY_TO`.
- Send test emails for organization invite, billing failure, viewing confirmation, escrow document approval, dispute raised, release receipt, and refund receipt.
- For browser push, set `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, and `WEB_PUSH_CONTACT_EMAIL`.
- For Android push, set either `FCM_SERVER_KEY` or `FCM_PROJECT_ID` plus `FCM_ACCESS_TOKEN`.
- For iOS push, set `APNS_BEARER_TOKEN`, `APNS_BUNDLE_ID`, and `APNS_USE_SANDBOX` correctly per environment.

## 5. Flutterwave Fallback And Africa Lane

- Create the live Flutterwave account and confirm allowed currencies, transfer corridors, and refund support.
- Set `VITE_FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, and `FLUTTERWAVE_WEBHOOK_SECRET_HASH`.
- Create recurring plan IDs for Starter, Growth, and Pro, then set `FLUTTERWAVE_PLAN_ID_STARTER`, `FLUTTERWAVE_PLAN_ID_GROWTH`, and `FLUTTERWAVE_PLAN_ID_PRO`.
- Configure fallback release details using `FLUTTERWAVE_DEFAULT_ESCROW_BENEFICIARY_ID` or bank account fields only for controlled launch accounts.
- Confirm the live webhook points to the deployed unified `payment-webhook` endpoint.
- Run `npm run prod:env:check -- --strict-payments --env-file=.env.production`.
- Record sandbox evidence for successful payment, failed payment, duplicate webhook, subscription renewal, subscription failure, refund, chargeback, transfer release, and provider fallback.

## 6. Public Map Discovery

- Default public map discovery now runs on OpenStreetMap tiles with live listing pins.
- If you want a branded hosted tile service instead, set `VITE_MAP_PROVIDER=maptiler` and store `VITE_MAPTILER_KEY` in the deployment environment.
- Run `npm run prod:env:check -- --env-file=.env.production` after changing map settings; the checker now validates MapTiler configuration when selected.
- Confirm the deployed `/search` page loads tiles, fits bounds around plotted listings, and still handles listings without verified coordinates cleanly.
- Confirm one public property detail page shows the live map surface, route planner, and external map handoff without console errors.

## 7. SMS, WhatsApp, And USSD

- Choose the production SMS/WhatsApp provider and store `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, and `TWILIO_WHATSAPP_FROM` when using Twilio.
- Register sender ID or short code with the relevant Ghana/NCA provider process before sending public messages.
- Store `USSD_PROVIDER_NAME`, `USSD_SHORT_CODE`, `USSD_API_ENDPOINT`, `USSD_API_KEY`, and `USSD_WEBHOOK_SECRET` when the USSD partner is ready.
- Confirm opt-in, opt-out, message templates, retry limits, and abuse throttles with Legal/Ops.
- Run `npm run prod:env:check -- --strict-comms --env-file=.env.production`.
- Record sandbox evidence for SMS delivery, WhatsApp template delivery, USSD handoff, opt-out, and rate-limit behavior.

## 8. Identity, Registry, And Hyperlocal Data

- Select Ghana Card and liveness providers, then set `GHANA_CARD_PROVIDER`, `GHANA_CARD_API_ENDPOINT`, `GHANA_CARD_API_KEY`, `LIVENESS_PROVIDER`, and `LIVENESS_API_KEY`.
- Complete a DPIA and consent copy review before enabling automated identity or biometric checks.
- Select official or manual land/title verification sources, then set `LAND_REGISTRY_PROVIDER`, `LAND_REGISTRY_API_ENDPOINT`, and `LAND_REGISTRY_API_KEY` if an API is available.
- Select trusted hyperlocal data sources, then set `HYPERLOCAL_DATA_PROVIDER`, `HYPERLOCAL_DATA_API_KEY`, `FLOOD_DATA_ENDPOINT`, `POWER_RELIABILITY_DATA_ENDPOINT`, `WATER_RELIABILITY_DATA_ENDPOINT`, `SAFETY_DATA_ENDPOINT`, and `TRANSIT_DATA_ENDPOINT`.
- Run `npm run prod:env:check -- --strict-identity --strict-data --env-file=.env.production`.
- Record sandbox or manual-review evidence for Ghana Card, liveness, registry, flood, power, water, safety, and transit data checks before public badges depend on those signals.

## 9. Fraud, Monitoring, And Backup Proof

- Select image authenticity, device risk, and sanctions/PEP vendors, then set `FRAUD_IMAGE_AUTH_PROVIDER`, `FRAUD_IMAGE_AUTH_API_KEY`, `DEVICE_RISK_PROVIDER`, `DEVICE_RISK_API_KEY`, `SANCTIONS_SCREENING_PROVIDER`, and `SANCTIONS_SCREENING_API_KEY`.
- Configure error monitoring, uptime checks, and log drains with `MONITORING_PROVIDER`, `MONITORING_DSN`, `UPTIME_MONITOR_URL`, and `LOG_DRAIN_ENDPOINT`.
- Enable Supabase backups/PITR where plan support allows, then store `BACKUP_PROVIDER`, `SUPABASE_PITR_ENABLED`, and `BACKUP_RESTORE_EVIDENCE_URL`.
- Run `npm run prod:env:check -- --strict-ops --strict-identity --env-file=.env.production`.
- Record a backup restore drill and attach evidence in `/admin/launch` before treating production recovery as proven.

## 10. Integrity Audit And Anchoring

- Generate a production RSA key pair outside the repo.
- Store `AUDIT_RSA_PRIVATE_KEY_PEM` only in the deployment secret manager.
- Publish `AUDIT_RSA_PUBLIC_KEY_PEM` through the public verification key endpoint.
- Keep `AUDIT_RSA_PUBLIC_KEY_ID` stable for receipt verification.
- Create a public GitHub anchor repository or dedicated folder in an existing public repo.
- Set `ANCHOR_JOB_SECRET`, `GITHUB_ANCHOR_TOKEN`, `GITHUB_ANCHOR_REPO`, and `GITHUB_ANCHOR_BRANCH`.
- Configure a weekly cron job to call `anchor-integrity-audit` with the job secret.
- After the first cron run, confirm the anchor hash appears in the public repository and `integrity_anchors`.

## 11. Smart Property Access Providers

- Decide which provider launches first: TTLock, Yale, or Tuya.
- Store provider command endpoints and access tokens server-side only.
- Run `npm run prod:env:check -- --strict-iot --env-file=.env.production` before enabling live unlock actions.
- In the workspace Smart Access page, mark each provider connection only after secrets are vaulted, webhook signatures are verified, and a real-device code cycle passes.
- Test device registry, grant creation, viewing access, tenant access, revoke, provider offline, failed unlock, and audit log events.
- Document the human fallback path for provider outages before inviting real tenants to use Smart Property Access.

## 12. Legal And Operations Decisions

- Escrow fee: set the initial percentage before public escrow launch. Recommended starting range: 1% to 2%.
- FX handling: lock diaspora exchange rate at payment time and show the rate on receipts.
- Refund procedures: define who can approve refunds, required evidence, timing, and payer communication.
- Device support policy: define supported providers, owner responsibilities, emergency lockout, and outage handling.
- Counsel must approve Terms, Privacy Notice, escrow language, refund language, and Smart Property Access terms.

## 13. Production Smoke Test

After deployment and provider setup:

- Open `/`, `/search`, `/legal/terms`, `/legal/privacy`, `/get-the-app`, `/workspace`, `/admin`, and one public listing page.
- In `/search`, toggle map view, select multiple pins, and confirm the map recenters and external map handoff works.
- Create a test organization and complete the subscription activation flow.
- Invite an agent and confirm the seat cap still works.
- Create a listing, publish it, browse it publicly, submit an inquiry, and request a viewing.
- Run a low-value escrow payment through the intended processor and complete document approval, payer confirmation, release, and receipt.
- Raise and resolve one test dispute using refund flow.
- If IoT is enabled, create one test access grant and revoke it immediately after validating the provider command path.
