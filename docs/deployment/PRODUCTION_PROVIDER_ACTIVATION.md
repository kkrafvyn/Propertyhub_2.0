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

## 5. Integrity Audit And Anchoring

- Generate a production RSA key pair outside the repo.
- Store `AUDIT_RSA_PRIVATE_KEY_PEM` only in the deployment secret manager.
- Publish `AUDIT_RSA_PUBLIC_KEY_PEM` through the public verification key endpoint.
- Keep `AUDIT_RSA_PUBLIC_KEY_ID` stable for receipt verification.
- Create a public GitHub anchor repository or dedicated folder in an existing public repo.
- Set `ANCHOR_JOB_SECRET`, `GITHUB_ANCHOR_TOKEN`, `GITHUB_ANCHOR_REPO`, and `GITHUB_ANCHOR_BRANCH`.
- Configure a weekly cron job to call `anchor-integrity-audit` with the job secret.
- After the first cron run, confirm the anchor hash appears in the public repository and `integrity_anchors`.

## 6. Smart Property Access Providers

- Decide which provider launches first: TTLock, Yale, or Tuya.
- Store provider command endpoints and access tokens server-side only.
- Run `npm run prod:env:check -- --strict-iot --env-file=.env.production` before enabling live unlock actions.
- Test device registry, grant creation, viewing access, tenant access, revoke, provider offline, failed unlock, and audit log events.
- Document the human fallback path for provider outages before inviting real tenants to use Smart Property Access.

## 7. Legal And Operations Decisions

- Escrow fee: set the initial percentage before public escrow launch. Recommended starting range: 1% to 2%.
- FX handling: lock diaspora exchange rate at payment time and show the rate on receipts.
- Refund procedures: define who can approve refunds, required evidence, timing, and payer communication.
- Device support policy: define supported providers, owner responsibilities, emergency lockout, and outage handling.
- Counsel must approve Terms, Privacy Notice, escrow language, refund language, and Smart Property Access terms.

## 8. Production Smoke Test

After deployment and provider setup:

- Open `/`, `/search`, `/legal/terms`, `/legal/privacy`, `/get-the-app`, `/workspace`, `/admin`, and one public listing page.
- Create a test organization and complete the subscription activation flow.
- Invite an agent and confirm the seat cap still works.
- Create a listing, publish it, browse it publicly, submit an inquiry, and request a viewing.
- Run a low-value escrow payment through the intended processor and complete document approval, payer confirmation, release, and receipt.
- Raise and resolve one test dispute using refund flow.
- If IoT is enabled, create one test access grant and revoke it immediately after validating the provider command path.
