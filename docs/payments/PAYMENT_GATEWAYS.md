# BaytMiftah Payment Gateways

BaytMiftah uses one property payment ledger and provider-specific adapters behind it. The user flow stays simple: pick a gateway, complete hosted checkout, return to `/app/payments`, then the backend verifies the reference and creates the receipt.

Checkout initialization is resilient: the selected provider is tried first, then the backend falls back through configured secondary gateways. Paystack is the live default while only Paystack credentials are configured, so selecting Stripe or Flutterwave will safely fall back to Paystack instead of blocking checkout.

## Gateways

- Paystack: active checkout, verification, webhooks, transfers, and refunds.
- Stripe: same property checkout, verification, escrow release, and refund contract once Stripe secrets are configured.
- Flutterwave: same property checkout, verification, escrow release, and refund contract once Flutterwave secrets and payout identifiers are configured.
- IT Consortium / TheTeller: backend scaffold is ready, but keep the UI disabled until merchant credentials and checkout response shape are confirmed in production testing.

## Supabase Secrets

Set these before deploying payment functions:

```bash
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_SECRET_HASH=
FLUTTERWAVE_API_BASE_URL=https://api.flutterwave.com
FLUTTERWAVE_DEFAULT_ESCROW_BENEFICIARY_ID=
FLUTTERWAVE_DEFAULT_ESCROW_ACCOUNT_BANK=
FLUTTERWAVE_DEFAULT_ESCROW_ACCOUNT_NUMBER=
FLUTTERWAVE_TRANSFER_CALLBACK_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER_USD=
STRIPE_PRICE_ID_GROWTH_USD=
STRIPE_PRICE_ID_PRO_USD=
STRIPE_PRICE_ID_STARTER_GBP=
STRIPE_PRICE_ID_GROWTH_GBP=
STRIPE_PRICE_ID_PRO_GBP=
FLUTTERWAVE_PLAN_ID_STARTER=
FLUTTERWAVE_PLAN_ID_GROWTH=
FLUTTERWAVE_PLAN_ID_PRO=
FLUTTERWAVE_PLAN_ID_STARTER_GHS=
FLUTTERWAVE_PLAN_ID_GROWTH_GHS=
FLUTTERWAVE_PLAN_ID_PRO_GHS=
IT_CONSORTIUM_ENABLED=false
IT_CONSORTIUM_ENVIRONMENT=test
IT_CONSORTIUM_USERNAME=
IT_CONSORTIUM_API_KEY=
IT_CONSORTIUM_MERCHANT_ID=
IT_CONSORTIUM_CHECKOUT_BASE_URL=https://checkout-test.theteller.net
IT_CONSORTIUM_API_BASE_URL=https://test.theteller.net
```

## Webhooks

- Unified signed webhook: `/functions/v1/payment-webhook`
- Paystack compatibility webhook: `/functions/v1/paystack-webhook`
- Flutterwave webhook: `/functions/v1/flutterwave-webhook`

## Provider-Neutral Escrow Contract

All property payment lanes now use the same backend jobs:

- `initialize-property-payment` starts hosted checkout through the selected provider, then falls back to configured providers.
- `verify-property-payment` verifies the payment and reconciles the same `property_transactions` ledger.
- `manage-property-escrow` releases or refunds using the processor that collected the funds.
- `initiate-paystack-refund` is kept as a compatibility endpoint name, but it now routes refunds through the provider-neutral refund service.

Because only the Paystack key is currently available, Paystack is the only live processor today. Stripe and Flutterwave are wired to the same interface and will activate when their secrets and payout identifiers are added.

## Provider-Neutral Workspace Subscriptions

Organization onboarding now follows the same pattern: the requested subscription provider is tried first, and the backend selects the first configured provider that can activate the workspace.

- Paystack needs `PAYSTACK_SECRET_KEY` plus `PAYSTACK_PLAN_CODE_STARTER/GROWTH/PRO`.
- Stripe needs `STRIPE_SECRET_KEY` plus tier price IDs.
- Flutterwave needs `FLUTTERWAVE_SECRET_KEY` plus tier payment plan IDs.
- If Stripe or Flutterwave is selected but not configured, checkout falls back to Paystack when Paystack is configured.

## Deployment

Run the payment deployment helper after the Supabase CLI is installed and authenticated:

```bash
npm run supabase:deploy:payments -- --project-ref <project-ref> --env-file supabase/.env.payments
```

This applies migrations, uploads secrets, deploys the generic payment functions, keeps the legacy Paystack functions for compatibility, and deploys both webhook handlers.

## Official References

- Paystack Transaction API: https://paystack.com/docs/api/transaction/
- Paystack Webhooks: https://paystack.com/docs/payments/webhooks
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Flutterwave Standard Checkout: https://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1
- Flutterwave transaction verification by reference: https://developer.flutterwave.com/v3.0/reference/verify-transaction-with-tx_ref
- Flutterwave transaction refund: https://developer.flutterwave.com/v3.0/reference/transaction-refund
- Flutterwave transfers: https://developer.flutterwave.com/v3.0/reference/create-a-transfer
- Flutterwave payment plans: https://developer.flutterwave.com/v3.0/docs/payment-plans-1
- IT Consortium TheTeller documentation: https://www.theteller.net/documentation
