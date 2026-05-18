# BaytMiftah Payment Gateways

BaytMiftah uses one property payment ledger and provider-specific adapters behind it. The user flow stays simple: pick a gateway, complete hosted checkout, return to `/app/payments`, then the backend verifies the reference and creates the receipt.

## Gateways

- Paystack: active checkout, verification, webhooks, and refunds.
- Flutterwave: active checkout, verification, and webhook reconciliation.
- IT Consortium / TheTeller: backend scaffold is ready, but keep the UI disabled until merchant credentials and checkout response shape are confirmed in production testing.

## Supabase Secrets

Set these before deploying payment functions:

```bash
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_SECRET_HASH=
FLUTTERWAVE_API_BASE_URL=https://api.flutterwave.com
IT_CONSORTIUM_ENABLED=false
IT_CONSORTIUM_ENVIRONMENT=test
IT_CONSORTIUM_USERNAME=
IT_CONSORTIUM_API_KEY=
IT_CONSORTIUM_MERCHANT_ID=
IT_CONSORTIUM_CHECKOUT_BASE_URL=https://checkout-test.theteller.net
IT_CONSORTIUM_API_BASE_URL=https://test.theteller.net
```

## Webhooks

- Paystack webhook: `/functions/v1/paystack-webhook`
- Flutterwave webhook: `/functions/v1/flutterwave-webhook`

## Deployment

Run the payment deployment helper after the Supabase CLI is installed and authenticated:

```bash
npm run supabase:deploy:payments -- --project-ref <project-ref> --env-file supabase/.env.payments
```

This applies migrations, uploads secrets, deploys the generic payment functions, keeps the legacy Paystack functions for compatibility, and deploys both webhook handlers.

## Official References

- Paystack Transaction API: https://paystack.com/docs/api/transaction/
- Paystack Webhooks: https://paystack.com/docs/payments/webhooks
- Flutterwave Standard Checkout: https://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1
- Flutterwave transaction verification by reference: https://developer.flutterwave.com/v3.0/reference/verify-transaction-with-tx_ref
- IT Consortium TheTeller documentation: https://www.theteller.net/documentation
